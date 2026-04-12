"""
Business logic for consultation investigation items (catalog, custom, package).
"""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from consultations_core.models.consultation import Consultation
from consultations_core.models.investigation import (
    ConsultationInvestigations,
    CustomInvestigation,
    InvestigationItem,
    InvestigationSource,
    InvestigationUrgency,
)
from diagnostics_engine.models import DiagnosticPackage, DiagnosticPackageItem, DiagnosticServiceMaster


def get_or_create_investigations_container(consultation: Consultation) -> ConsultationInvestigations:
    container, _ = ConsultationInvestigations.objects.get_or_create(consultation=consultation)
    return container


def _active_items_qs(container: ConsultationInvestigations):
    return InvestigationItem.objects.filter(investigations=container, is_deleted=False)


def _max_position(container: ConsultationInvestigations) -> int:
    agg = _active_items_qs(container).aggregate(m=Max("position"))
    return int(agg["m"] or 0)


def _shift_positions_down_from(container: ConsultationInvestigations, from_pos: int) -> None:
    """Increment position for all active items with position >= from_pos (insert gap). Order high→low."""
    qs = (
        _active_items_qs(container)
        .filter(position__gte=from_pos)
        .order_by("-position")
        .select_for_update()
    )
    for item in qs:
        item.position = item.position + 1
        item.save(update_fields=["position"])


def _next_append_position(container: ConsultationInvestigations) -> int:
    return _max_position(container) + 1


def compact_positions(container: ConsultationInvestigations) -> None:
    """Reorder active items to 1..n."""
    items = list(_active_items_qs(container).order_by("position", "created_at"))
    for i, item in enumerate(items, start=1):
        if item.position != i:
            item.position = i
            item.save(update_fields=["position"])


def reposition_active_item(container: ConsultationInvestigations, item: InvestigationItem, new_position: int) -> None:
    """Move an active item to 1-based new_position and renumber siblings."""
    if item.is_deleted or item.investigations_id != container.id:
        raise ValueError("Invalid item for reposition")
    others = list(_active_items_qs(container).exclude(pk=item.pk).order_by("position", "created_at"))
    n = len(others) + 1
    new_position = max(1, min(int(new_position), n))
    idx = new_position - 1
    ordered = others[:idx] + [item] + others[idx:]
    for i, it in enumerate(ordered, start=1):
        if it.position != i:
            it.position = i
            it.save(update_fields=["position"])


def build_package_expansion_snapshot(package: DiagnosticPackage) -> list[dict[str, Any]]:
    rows = (
        DiagnosticPackageItem.objects.filter(package=package, deleted_at__isnull=True)
        .select_related("service")
        .order_by("display_order", "service__name")
    )
    out: list[dict[str, Any]] = []
    for pi in rows:
        s = pi.service
        out.append(
            {
                "service_id": str(s.id),
                "service_code": s.code,
                "name": s.name,
                "included": True,
                "quantity": pi.quantity,
                "display_order": pi.display_order,
            }
        )
    return out


def find_duplicate_active_item(
    container: ConsultationInvestigations,
    *,
    source: str,
    catalog_item_id=None,
    custom_investigation_id=None,
    diagnostic_package_id=None,
) -> InvestigationItem | None:
    qs = _active_items_qs(container).filter(source=source)
    if source == InvestigationSource.CATALOG:
        return qs.filter(catalog_item_id=catalog_item_id).first()
    if source == InvestigationSource.CUSTOM:
        return qs.filter(custom_investigation_id=custom_investigation_id).first()
    if source == InvestigationSource.PACKAGE:
        return qs.filter(diagnostic_package_id=diagnostic_package_id).first()
    return None


def find_soft_deleted_duplicate(
    container: ConsultationInvestigations,
    *,
    source: str,
    catalog_item_id=None,
    custom_investigation_id=None,
    diagnostic_package_id=None,
) -> InvestigationItem | None:
    qs = InvestigationItem.objects.filter(investigations=container, is_deleted=True, source=source)
    if source == InvestigationSource.CATALOG:
        return qs.filter(catalog_item_id=catalog_item_id).first()
    if source == InvestigationSource.CUSTOM:
        return qs.filter(custom_investigation_id=custom_investigation_id).first()
    if source == InvestigationSource.PACKAGE:
        return qs.filter(diagnostic_package_id=diagnostic_package_id).first()
    return None


@transaction.atomic
def add_investigation_item(
    *,
    container: ConsultationInvestigations,
    source: str,
    user,
    catalog_item: DiagnosticServiceMaster | None = None,
    custom_investigation: CustomInvestigation | None = None,
    diagnostic_package: DiagnosticPackage | None = None,
    adhoc_name: str | None = None,
    adhoc_type: str | None = None,
    position: int | None = None,
    instructions: str | None = None,
    notes: str | None = None,
    urgency: str | None = None,
) -> tuple[InvestigationItem, dict[str, Any]]:
    """
    Returns (item, meta) where meta includes duplicate=True if an existing active row was returned.
    """
    meta: dict[str, Any] = {"duplicate": False, "restored": False}

    if source == InvestigationSource.CATALOG:
        dup = find_duplicate_active_item(
            container,
            source=source,
            catalog_item_id=catalog_item.id if catalog_item else None,
        )
        if dup:
            meta["duplicate"] = True
            return dup, meta

        restored = find_soft_deleted_duplicate(
            container,
            source=source,
            catalog_item_id=catalog_item.id if catalog_item else None,
        )
        if restored:
            meta["restored"] = True
            pos = position if position is not None else _next_append_position(container)
            if position is not None:
                _shift_positions_down_from(container, pos)
            restored.is_deleted = False
            restored.deleted_at = None
            restored.deleted_by = None
            restored.position = pos
            restored.updated_by = user
            if instructions is not None:
                restored.instructions = instructions
            if notes is not None:
                restored.notes = notes
            if urgency is not None:
                restored.urgency = urgency
            restored.save()
            return restored, meta

        pos = position if position is not None else _next_append_position(container)
        if position is not None:
            _shift_positions_down_from(container, pos)

        item = InvestigationItem(
            investigations=container,
            source=InvestigationSource.CATALOG,
            catalog_item=catalog_item,
            position=pos,
            instructions=instructions or "",
            notes=notes or "",
            urgency=urgency or InvestigationUrgency.ROUTINE,
            updated_by=user,
        )
        item.save()
        return item, meta

    if source == InvestigationSource.CUSTOM:
        if custom_investigation:
            dup = find_duplicate_active_item(
                container,
                source=source,
                custom_investigation_id=custom_investigation.id,
            )
            if dup:
                meta["duplicate"] = True
                return dup, meta

            restored = find_soft_deleted_duplicate(
                container,
                source=source,
                custom_investigation_id=custom_investigation.id,
            )
            if restored:
                meta["restored"] = True
                pos = position if position is not None else _next_append_position(container)
                if position is not None:
                    _shift_positions_down_from(container, pos)
                restored.is_deleted = False
                restored.deleted_at = None
                restored.deleted_by = None
                restored.position = pos
                restored.updated_by = user
                if instructions is not None:
                    restored.instructions = instructions
                if notes is not None:
                    restored.notes = notes
                if urgency is not None:
                    restored.urgency = urgency
                restored.save()
                return restored, meta

            pos = position if position is not None else _next_append_position(container)
            if position is not None:
                _shift_positions_down_from(container, pos)

            item = InvestigationItem(
                investigations=container,
                source=InvestigationSource.CUSTOM,
                custom_investigation=custom_investigation,
                position=pos,
                instructions=instructions or "",
                notes=notes or "",
                urgency=urgency or InvestigationUrgency.ROUTINE,
                updated_by=user,
            )
            item.save()
            return item, meta

        # Ad-hoc: name only (no CustomInvestigation row)
        name = (adhoc_name or "").strip()
        if not name:
            raise ValueError("custom_investigation_id or non-empty name is required for custom source")

        pos = position if position is not None else _next_append_position(container)
        if position is not None:
            _shift_positions_down_from(container, pos)

        item = InvestigationItem(
            investigations=container,
            source=InvestigationSource.CUSTOM,
            custom_investigation=None,
            name=name,
            investigation_type=adhoc_type or "other",
            position=pos,
            instructions=instructions or "",
            notes=notes or "",
            urgency=urgency or InvestigationUrgency.ROUTINE,
            updated_by=user,
        )
        item.save()
        return item, meta

    if source == InvestigationSource.PACKAGE:
        dup = find_duplicate_active_item(
            container,
            source=source,
            diagnostic_package_id=diagnostic_package.id if diagnostic_package else None,
        )
        if dup:
            meta["duplicate"] = True
            return dup, meta

        restored = find_soft_deleted_duplicate(
            container,
            source=source,
            diagnostic_package_id=diagnostic_package.id if diagnostic_package else None,
        )
        snapshot = build_package_expansion_snapshot(diagnostic_package)
        meta["package_lines"] = len(snapshot)

        if restored:
            meta["restored"] = True
            pos = position if position is not None else _next_append_position(container)
            if position is not None:
                _shift_positions_down_from(container, pos)
            restored.is_deleted = False
            restored.deleted_at = None
            restored.deleted_by = None
            restored.position = pos
            restored.package_expansion_snapshot = snapshot
            restored.updated_by = user
            if instructions is not None:
                restored.instructions = instructions
            if notes is not None:
                restored.notes = notes
            if urgency is not None:
                restored.urgency = urgency
            restored.save()
            return restored, meta

        pos = position if position is not None else _next_append_position(container)
        if position is not None:
            _shift_positions_down_from(container, pos)

        item = InvestigationItem(
            investigations=container,
            source=InvestigationSource.PACKAGE,
            diagnostic_package=diagnostic_package,
            package_expansion_snapshot=snapshot,
            position=pos,
            instructions=instructions or "",
            notes=notes or "",
            urgency=urgency or InvestigationUrgency.ROUTINE,
            updated_by=user,
        )
        item.save()
        return item, meta

    raise ValueError(f"Unsupported source: {source}")


@transaction.atomic
def soft_delete_item(item: InvestigationItem, *, user) -> None:
    item.is_deleted = True
    item.deleted_at = timezone.now()
    item.deleted_by = user
    item.save(update_fields=["is_deleted", "deleted_at", "deleted_by", "updated_at"])
    compact_positions(item.investigations)


def get_or_create_custom_investigation_master(
    *,
    name: str,
    investigation_type: str,
    user,
    clinic,
) -> tuple[CustomInvestigation, bool]:
    """
    Idempotent: same clinic + case-insensitive name returns existing row.
    If clinic is None, dedupe by (created_by, name__iexact).
    """
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("name is required")

    if clinic is not None:
        existing = (
            CustomInvestigation.objects.filter(
                clinic_id=clinic.id,
                name__iexact=name_clean,
                is_active=True,
            )
            .first()
        )
        if existing:
            return existing, False
    else:
        existing = (
            CustomInvestigation.objects.filter(
                created_by=user,
                clinic__isnull=True,
                name__iexact=name_clean,
                is_active=True,
            )
            .first()
        )
        if existing:
            return existing, False

    row = CustomInvestigation.objects.create(
        name=name_clean,
        investigation_type=investigation_type,
        created_by=user,
        clinic=clinic,
        is_active=True,
    )
    return row, True
