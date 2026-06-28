"""Transactional orchestration: consultation investigations → diagnostic order + test lines.

This service is the canonical transactional orchestration entrypoint

for converting clinical InvestigationItems into commercial and operational

diagnostic execution objects.

All EMR, API, WhatsApp, and future patient app order creation flows

must use this service.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from consultations_core.domain.audit import AuditService
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import (
    InvestigationItem,
    InvestigationSource,
    PrescriptionSource,
)
from diagnostics_engine.domain.investigation_resolution import (
    load_convertible_investigation_items,
    normalize_package_composition,
)
from diagnostics_engine.domain.order_numbers import allocate_diagnostic_order_number
from diagnostics_engine.domain.package_orders import (
    ensure_test_lines_for_test_items,
    expand_confirmed_order_packages,
)
from diagnostics_engine.domain.pricing import PricingQuoteService
from diagnostics_engine.models.choices import OrderLineType, OrderStatus
from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderItem, DiagnosticOrderTestLine
from labs.models import BranchPackagePricing, LabBranch

if TYPE_CHECKING:
    from account.models import User
    from doctor.models import doctor as DoctorModel
    from patient_account.models import PatientProfile


@dataclass(frozen=True)
class DiagnosticOrderCreationResult:
    order: DiagnosticOrder
    items_created: int
    test_lines_created: int
    idempotent: bool


_PRESCRIPTION_TO_RECOMMENDATION = {
    PrescriptionSource.DOCTOR_SELECTED: "manual",
    PrescriptionSource.TEMPLATE: "bundle",
    PrescriptionSource.AI: "ai",
}


def _recommendation_source(inv: InvestigationItem) -> str:
    ps = inv.prescription_source or PrescriptionSource.DOCTOR_SELECTED
    return _PRESCRIPTION_TO_RECOMMENDATION.get(ps, "manual")


def _schedule_diagnostic_routing_if_has_test_lines(*, order: DiagnosticOrder, created_by: Any) -> None:
    """Queue marketplace routing after this DB transaction commits (non-blocking for callers)."""
    if not DiagnosticOrderTestLine.objects.filter(order_id=order.pk).exists():
        return
    from diagnostics_engine.services.routing.routing_helpers import (
        describe_diagnostic_order_tests,
        privacy_patient_label,
        routing_journey_human,
        routing_journey_info,
        schedule_routing_after_commit,
    )

    patient_full = order.patient_profile.get_full_name() if order.patient_profile else ""
    tests_h = describe_diagnostic_order_tests(order)
    routing_journey_human(
        "Diagnostics · Consultation saved for %s. Order %s is queued for the lab network. "
        "Selected tests: %s.",
        privacy_patient_label(patient_full),
        order.order_number,
        tests_h,
    )
    routing_journey_info(
        "[routing journey] Order %s (%s): diagnostic order persisted from consultation — scheduling automatic "
        "lab routing after commit (doctor-selected branch_id=%s remains pricing/catalog context until router "
        "picks the marketplace winner).",
        order.pk,
        order.order_number,
        order.branch_id,
    )
    schedule_routing_after_commit(
        order.pk,
        triggered_by_id=getattr(created_by, "pk", None) if created_by else None,
    )


class DiagnosticOrderCreationService:
    """Canonical EMR → commercial diagnostic order → execution rows (one atomic transaction)."""

    @classmethod
    def create_order_from_consultation(
        cls,
        *,
        consultation: Consultation,
        encounter: ClinicalEncounter | None = None,
        patient_profile: PatientProfile | None = None,
        doctor: DoctorModel | None = None,
        branch: LabBranch | None = None,
        branch_id: Any = None,
        source: str = "emr",
        created_by: User | None = None,
    ) -> DiagnosticOrderCreationResult:
        if not consultation or not consultation.pk:
            raise ValidationError("consultation is required.")

        @transaction.atomic
        def _run() -> DiagnosticOrderCreationResult:
            Consultation.objects.select_for_update().filter(pk=consultation.pk).first()

            enc = encounter or consultation.encounter
            if enc is None:
                raise ValidationError("Consultation is missing encounter.")
            if consultation.encounter_id != enc.id:
                raise ValidationError("encounter does not match consultation.")

            profile = patient_profile or enc.patient_profile
            doc = doctor or enc.doctor
            if doc is None:
                raise ValidationError("doctor is required (set on encounter or pass explicitly).")

            resolved_branch = cls._resolve_branch(branch=branch, branch_id=branch_id)

            existing = (
                DiagnosticOrder.objects.select_for_update()
                .filter(
                    consultation_id=consultation.pk,
                    encounter_id=enc.id,
                    is_active=True,
                )
                .exclude(status=OrderStatus.CANCELLED)
                .order_by("created_at")
                .first()
            )
            if existing:
                n_items = existing.items.filter(deleted_at__isnull=True).count()
                n_lines = DiagnosticOrderTestLine.objects.filter(order_id=existing.pk).count()
                _schedule_diagnostic_routing_if_has_test_lines(order=existing, created_by=created_by)
                return DiagnosticOrderCreationResult(
                    order=existing,
                    items_created=n_items,
                    test_lines_created=n_lines,
                    idempotent=True,
                )

            convertible = load_convertible_investigation_items(consultation)

            order = cls._create_order_record(
                consultation=consultation,
                encounter=enc,
                patient_profile=profile,
                doctor=doc,
                branch=resolved_branch,
                source=source,
                created_by=created_by,
            )

            pairs = cls._create_order_items(
                order=order,
                investigations=convertible,
                branch=resolved_branch,
                created_by=created_by,
            )
            cls._link_investigations(pairs)

            cls._calculate_totals(order)
            cls._confirm_order(order, created_by)
            cls._expand_test_lines(order, created_by)

            order.refresh_from_db()
            n_items = order.items.filter(deleted_at__isnull=True).count()
            n_lines = DiagnosticOrderTestLine.objects.filter(order_id=order.pk).count()
            _schedule_diagnostic_routing_if_has_test_lines(order=order, created_by=created_by)
            return DiagnosticOrderCreationResult(
                order=order,
                items_created=n_items,
                test_lines_created=n_lines,
                idempotent=False,
            )

        return _run()

    @staticmethod
    def _resolve_branch(
        *,
        branch: LabBranch | None,
        branch_id: Any,
    ) -> LabBranch | None:
        if branch is not None:
            if not branch.is_active or branch.is_deleted:
                raise ValidationError("Lab branch is not active.")
            if not branch.is_active_for_orders:
                raise ValidationError("Lab branch is not accepting orders.")
            return branch
        if branch_id is None:
            return None
        try:
            b = LabBranch.objects.get(pk=branch_id)
        except LabBranch.DoesNotExist as exc:
            raise ValidationError("branch_id does not exist.") from exc
        if not b.is_active or b.is_deleted:
            raise ValidationError("Lab branch is not active.")
        if not b.is_active_for_orders:
            raise ValidationError("Lab branch is not accepting orders.")
        return b

    @classmethod
    def _create_order_record(
        cls,
        *,
        consultation: Consultation,
        encounter: ClinicalEncounter,
        patient_profile: PatientProfile,
        doctor: DoctorModel,
        branch: LabBranch | None,
        source: str,
        created_by: User | None,
    ) -> DiagnosticOrder:
        last_error: IntegrityError | None = None
        for _ in range(12):
            order_number = allocate_diagnostic_order_number()
            order = DiagnosticOrder(
                order_number=order_number,
                encounter=encounter,
                consultation=consultation,
                patient_profile=patient_profile,
                doctor=doctor,
                branch=branch,
                status=OrderStatus.CREATED,
                source=source,
                created_by=created_by,
                updated_by=created_by,
            )
            try:
                order.save()
                return order
            except IntegrityError as exc:
                last_error = exc
                if "order_number" in str(exc).lower() or "unique" in str(exc).lower():
                    continue
                raise
        raise ValidationError("Could not allocate a unique order number.") from last_error

    @classmethod
    def _create_order_items(
        cls,
        *,
        order: DiagnosticOrder,
        investigations: list[InvestigationItem],
        branch: LabBranch | None,
        created_by: User | None,
    ) -> list[tuple[InvestigationItem, DiagnosticOrderItem]]:
        pairs: list[tuple[InvestigationItem, DiagnosticOrderItem]] = []
        any_home = False
        for display_order, inv in enumerate(investigations, start=1):
            if inv.source == InvestigationSource.CATALOG:
                svc = inv.catalog_item
                line_type = OrderLineType.TEST
                if branch:
                    try:
                        quote = PricingQuoteService.quote_service_line(branch, svc)
                    except ValueError as exc:
                        raise ValidationError(str(exc)) from exc
                    price = quote["selling_price"]
                    plat = quote["platform_earning_snapshot"]
                    doc = quote["doctor_earning_snapshot"]
                    lab = quote["lab_payout_snapshot"]
                    is_home = bool(quote.get("home_collection_supported"))
                else:
                    price = Decimal("0.00")
                    plat = doc = lab = Decimal("0.00")
                    is_home = bool(svc.home_collection_possible)
                meta: dict[str, Any] = {"investigation_item_id": str(inv.id)}
                if branch is None:
                    meta["pricing_pending_branch"] = True
                oi = DiagnosticOrderItem.objects.create(
                    order=order,
                    line_type=line_type,
                    service=svc,
                    diagnostic_package=None,
                    name_snapshot=svc.name,
                    price_snapshot=price,
                    platform_earning_snapshot=plat,
                    doctor_earning_snapshot=doc,
                    lab_payout_snapshot=lab,
                    is_price_derived=False,
                    is_home_collection_eligible=is_home,
                    requires_fasting=False,
                    requires_appointment=bool(svc.appointment_required),
                    metadata_snapshot=meta,
                    display_order=display_order,
                    recommendation_source=_recommendation_source(inv),
                    created_by=created_by,
                    updated_by=created_by,
                )
                pairs.append((inv, oi))
                any_home = any_home or is_home
            else:
                pkg = inv.diagnostic_package
                assert pkg is not None
                composition = normalize_package_composition(inv)
                line_type = OrderLineType.PACKAGE
                if branch:
                    try:
                        quote = PricingQuoteService.quote_package_line(branch, pkg)
                    except ValueError as exc:
                        raise ValidationError(str(exc)) from exc
                    price = quote["selling_price"]
                    plat = quote.get("platform_margin_value") or Decimal("0.00")
                    doc = quote.get("doctor_commission_value") or Decimal("0.00")
                    lab = quote.get("lab_payout_snapshot") or Decimal("0.00")
                    is_price_derived = bool(quote.get("is_price_derived"))
                    bpp_id = quote.get("branch_package_pricing_id")
                    bpp = BranchPackagePricing.objects.filter(pk=bpp_id).first() if bpp_id else None
                    is_home = bool(bpp.home_collection_supported) if bpp else False
                else:
                    price = Decimal("0.00")
                    plat = doc = lab = Decimal("0.00")
                    is_price_derived = False
                    is_home = False
                meta = {"investigation_item_id": str(inv.id)}
                if branch is None:
                    meta["pricing_pending_branch"] = True
                oi = DiagnosticOrderItem.objects.create(
                    order=order,
                    line_type=line_type,
                    service=None,
                    diagnostic_package=pkg,
                    package_version_snapshot=pkg.version,
                    composition_snapshot=composition,
                    name_snapshot=pkg.name,
                    price_snapshot=price,
                    platform_earning_snapshot=plat,
                    doctor_earning_snapshot=doc,
                    lab_payout_snapshot=lab,
                    is_price_derived=is_price_derived,
                    is_home_collection_eligible=is_home,
                    requires_fasting=bool(pkg.fasting_required),
                    requires_appointment=False,
                    metadata_snapshot=meta,
                    display_order=display_order,
                    recommendation_source=_recommendation_source(inv),
                    created_by=created_by,
                    updated_by=created_by,
                )
                pairs.append((inv, oi))
                any_home = any_home or is_home

        order.sample_collection_mode = "home" if any_home else "lab"
        order.save(update_fields=["sample_collection_mode", "updated_at"])
        return pairs

    @staticmethod
    def _link_investigations(pairs: list[tuple[InvestigationItem, DiagnosticOrderItem]]) -> None:
        for inv, oi in pairs:
            inv.diagnostic_order_item = oi
            inv.save(update_fields=["diagnostic_order_item", "updated_at"])

    @staticmethod
    def _calculate_totals(order: DiagnosticOrder) -> None:
        total = Decimal("0.00")
        for row in order.items.filter(deleted_at__isnull=True).values_list("price_snapshot", flat=True):
            total += row or Decimal("0.00")
        order.total_amount_snapshot = total
        order.discount_amount = Decimal("0.00")
        order.final_amount = total - order.discount_amount
        order.save(update_fields=["total_amount_snapshot", "discount_amount", "final_amount", "updated_at"])

    @staticmethod
    def _confirm_order(order: DiagnosticOrder, user: User | None) -> None:
        old_status = order.status
        if old_status != OrderStatus.CREATED:
            raise ValidationError("Order is not in created state; cannot confirm.")
        order.status = OrderStatus.CONFIRMED
        order.save(update_fields=["status", "updated_at"])
        AuditService.log_status_change(
            instance=order,
            field_name="status",
            old_value=old_status,
            new_value=order.status,
            user=user,
            source="orchestration",
            reason=None,
        )

    @staticmethod
    def _expand_test_lines(order: DiagnosticOrder, user: User | None) -> None:
        expand_confirmed_order_packages(order, user)
        ensure_test_lines_for_test_items(order, user)
