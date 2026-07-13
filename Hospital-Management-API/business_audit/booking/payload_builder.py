"""Payload builders for diagnostic booking business audit events."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from business_audit.booking.constants import (
    BOOKING_ENGINE_VERSION,
    COLLECTION_MODE_HOME,
    COLLECTION_MODE_VISIT,
    STAGE_CANCELLATION,
    STAGE_CLOSURE,
    STAGE_CONFIRMATION,
    STAGE_CREATION,
    STAGE_EXPIRATION,
    STAGE_MODIFICATION,
)
from shared.audit.sanitization import sanitize_audit_payload
from shared.logging.context import get_context_manager


class BookingPayloadBuilder:
    """Builds sanitized operational payloads for booking audit events."""

    @staticmethod
    def _resolve_recommendation_id(order) -> str | None:
        meta = getattr(order, "operational_metadata", None) or {}
        rec_id = meta.get("recommendation_id")
        if rec_id:
            return str(rec_id)
        ctx = get_context_manager().get()
        parent = ctx.parent_workflow_instance_id or ctx.recommendation_id
        return str(parent) if parent else None

    @staticmethod
    def _collection_mode_label(order) -> str:
        mode = getattr(order, "sample_collection_mode", None) or "lab"
        if mode == "home":
            return COLLECTION_MODE_HOME
        return COLLECTION_MODE_VISIT

    @staticmethod
    def _decimal_str(value: Decimal | float | int | None) -> str | None:
        if value is None:
            return None
        return str(value)

    @classmethod
    def _resolve_slot(cls, order) -> dict[str, str | None]:
        visit = getattr(order, "visit_appointment", None)
        if visit is not None and not getattr(visit, "is_deleted", False):
            return {
                "date": visit.appointment_date.isoformat() if visit.appointment_date else None,
                "time": visit.appointment_slot or None,
            }

        collection = getattr(order, "collection_request", None)
        if collection is not None and not getattr(collection, "is_deleted", False):
            slot_date = collection.confirmed_date or collection.preferred_date
            slot_time = collection.confirmed_slot or collection.preferred_slot
            return {
                "date": slot_date.isoformat() if slot_date else None,
                "time": slot_time or None,
            }

        scheduled = getattr(order, "scheduled_at", None)
        if scheduled is not None:
            return {
                "date": scheduled.date().isoformat(),
                "time": scheduled.strftime("%H:%M"),
            }
        return {"date": None, "time": None}

    @classmethod
    def _resolve_collection_address(cls, order) -> dict[str, Any] | None:
        collection = getattr(order, "collection_request", None)
        if collection is None or getattr(collection, "is_deleted", False):
            return None
        snapshot = getattr(collection, "address_snapshot", None) or {}
        return dict(snapshot) if snapshot else None

    @classmethod
    def _resolve_lab_ids(cls, order) -> tuple[str | None, str | None]:
        branch = getattr(order, "branch", None)
        if branch is None:
            branch_id = getattr(order, "branch_id", None)
            if branch_id is None:
                return None, None
            try:
                from labs.models import LabBranch

                branch = LabBranch.objects.select_related("organization").filter(pk=branch_id).first()
            except Exception:
                return None, str(branch_id) if branch_id else None
        if branch is None:
            return None, None
        lab_id = getattr(branch, "organization_id", None)
        return (str(lab_id) if lab_id else None, str(branch.pk))

    @classmethod
    def _base_context(
        cls,
        order,
        *,
        operational_stage: str,
        downstream_systems: list[str],
        **extra: Any,
    ) -> dict[str, Any]:
        encounter = order.encounter
        consultation_id = str(order.consultation_id) if order.consultation_id else None
        laboratory_id, branch_id = cls._resolve_lab_ids(order)
        slot = cls._resolve_slot(order)
        collection_mode = cls._collection_mode_label(order)
        recommendation_id = cls._resolve_recommendation_id(order)

        payload: dict[str, Any] = {
            "operational_stage": operational_stage,
            "booking_id": str(order.pk),
            "order_number": getattr(order, "order_number", None),
            "recommendation_id": recommendation_id,
            "consultation_id": consultation_id,
            "patient_account_id": str(encounter.patient_account_id),
            "patient_profile_id": str(order.patient_profile_id),
            "encounter_id": str(order.encounter_id),
            "laboratory_id": laboratory_id,
            "branch_id": branch_id,
            "collection_mode": collection_mode,
            "collection_address": cls._resolve_collection_address(order),
            "slot": slot,
            "price": cls._decimal_str(getattr(order, "final_amount", None)),
            "discount": cls._decimal_str(getattr(order, "discount_amount", None)),
            "coupon": (getattr(order, "operational_metadata", None) or {}).get("coupon"),
            "home_collection": collection_mode == COLLECTION_MODE_HOME,
            "order_status": getattr(order, "status", None),
            "booking_engine_version": BOOKING_ENGINE_VERSION,
            "downstream_systems": downstream_systems,
        }
        payload.update({k: v for k, v in extra.items() if v is not None})
        return sanitize_audit_payload(payload)

    @classmethod
    def build_created(cls, order, *, downstream_systems: list[str]) -> dict[str, Any]:
        return cls._base_context(
            order,
            operational_stage=STAGE_CREATION,
            downstream_systems=downstream_systems,
        )

    @classmethod
    def build_confirmed(
        cls,
        order,
        *,
        downstream_systems: list[str],
        confirmation_source: str | None = None,
    ) -> dict[str, Any]:
        return cls._base_context(
            order,
            operational_stage=STAGE_CONFIRMATION,
            downstream_systems=downstream_systems,
            confirmation_source=confirmation_source,
        )

    @classmethod
    def build_modified(
        cls,
        order,
        *,
        downstream_systems: list[str],
        modification_reason: str,
        modification_version: int,
        change_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        return cls._base_context(
            order,
            operational_stage=STAGE_MODIFICATION,
            downstream_systems=downstream_systems,
            modification_reason=modification_reason,
            modification_version=modification_version,
            change_snapshot=change_snapshot,
        )

    @classmethod
    def build_cancelled(
        cls,
        order,
        *,
        downstream_systems: list[str],
        cancellation_reason: str,
        cancelled_by_id: str | None,
        prior_status: str | None,
        change_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        return cls._base_context(
            order,
            operational_stage=STAGE_CANCELLATION,
            downstream_systems=downstream_systems,
            cancellation_reason=cancellation_reason,
            cancelled_by_id=cancelled_by_id,
            prior_status=prior_status,
            change_snapshot=change_snapshot,
        )

    @classmethod
    def build_expired(
        cls,
        order,
        *,
        downstream_systems: list[str],
        expiration_reason: str,
        prior_status: str | None,
    ) -> dict[str, Any]:
        return cls._base_context(
            order,
            operational_stage=STAGE_EXPIRATION,
            downstream_systems=downstream_systems,
            expiration_reason=expiration_reason,
            prior_status=prior_status,
        )

    @classmethod
    def build_closed(
        cls,
        order,
        *,
        downstream_systems: list[str],
        prior_macro_state: str | None,
        change_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        extra: dict[str, Any] = {"prior_macro_state": prior_macro_state}
        if change_snapshot:
            extra["change_snapshot"] = change_snapshot
        return cls._base_context(
            order,
            operational_stage=STAGE_CLOSURE,
            downstream_systems=downstream_systems,
            **extra,
        )
