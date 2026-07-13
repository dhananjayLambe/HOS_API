"""Build communication context and resolve workflow hierarchy."""

from __future__ import annotations

from typing import Any

from business_audit.communication.constants import (
    ARTIFACT_TYPE_LAB_REPORT_PDF,
    DEFAULT_MIME_PDF,
)
from business_audit.communication.enums import CommunicationType
from business_audit.communication.types import CommunicationContext


def _report_order(report):
    line = getattr(report, "order_test_line", None)
    if line is None:
        return None
    return getattr(line, "order", None)


def resolve_recommendation_id(order) -> str | None:
    if order is None:
        return None
    meta = getattr(order, "operational_metadata", None) or {}
    rec_id = meta.get("recommendation_id")
    if rec_id:
        return str(rec_id)
    from shared.logging.context import get_context_manager

    ctx = get_context_manager().get()
    parent = ctx.parent_workflow_instance_id or ctx.recommendation_id
    return str(parent) if parent else None


def resolve_routing_id(order) -> str | None:
    if order is None:
        return None
    from diagnostics_engine.models.routing import RoutingRun

    run = (
        RoutingRun.objects.filter(diagnostic_order_id=order.pk)
        .order_by("-created_at")
        .first()
    )
    return str(run.pk) if run else None


def resolve_organization_id_from_report(report) -> str | None:
    order = _report_order(report)
    if order is None:
        return None
    encounter = getattr(order, "encounter", None)
    if encounter is None:
        return None
    return str(encounter.clinic_id)


def _primary_artifact_meta(report) -> dict[str, Any]:
    artifact = None
    artifacts = getattr(report, "artifacts", None)
    if artifacts is not None:
        artifact = (
            artifacts.filter(is_primary=True, is_deleted=False).first()
            or artifacts.filter(is_deleted=False).order_by("-created_at").first()
        )
    if artifact is None:
        return {
            "artifact_type": ARTIFACT_TYPE_LAB_REPORT_PDF,
            "artifact_version": getattr(report, "version", 1) or 1,
            "artifact_size_bytes": None,
            "mime_type": DEFAULT_MIME_PDF,
        }
    size = None
    if artifact.file:
        try:
            size = artifact.file.size
        except Exception:
            size = None
    mime = getattr(artifact, "mime_type", None) or DEFAULT_MIME_PDF
    return {
        "artifact_type": getattr(artifact, "artifact_type", None) or ARTIFACT_TYPE_LAB_REPORT_PDF,
        "artifact_version": getattr(artifact, "artifact_version", None) or 1,
        "artifact_size_bytes": size,
        "mime_type": mime,
    }


def build_report_communication_context(
    report,
    *,
    delivery_log=None,
    recipient: str | None = None,
) -> CommunicationContext:
    """Build CommunicationContext for report delivery use case."""
    communication_id = str(report.pk)
    order = _report_order(report)
    booking_id = str(order.pk) if order else None
    artifact_meta = _primary_artifact_meta(report)
    patient_account_id = None
    consultation_id = None
    if order is not None:
        encounter = getattr(order, "encounter", None)
        if encounter is not None:
            patient_account_id = str(encounter.patient_account_id) if encounter.patient_account_id else None
        consultation_id = str(order.consultation_id) if order.consultation_id else None

    attempt_number = 1
    communication_attempt_id = None
    if delivery_log is not None:
        communication_attempt_id = str(delivery_log.pk)
        attempt_number = int((delivery_log.retry_count or 0) + 1)
        recipient = recipient or delivery_log.recipient

    return CommunicationContext(
        communication_id=communication_id,
        communication_type=CommunicationType.REPORT,
        communication_attempt_id=communication_attempt_id,
        attempt_number=attempt_number,
        artifact_type=artifact_meta["artifact_type"],
        artifact_version=artifact_meta["artifact_version"],
        artifact_size_bytes=artifact_meta["artifact_size_bytes"],
        mime_type=artifact_meta["mime_type"],
        report_id=communication_id,
        booking_id=booking_id,
        routing_id=resolve_routing_id(order),
        recommendation_id=resolve_recommendation_id(order),
        patient_account_id=patient_account_id,
        consultation_id=consultation_id,
        recipient=recipient,
    )


def ensure_communication_attempt_metadata(delivery_log, *, report) -> tuple[str, int]:
    """Persist communication_id and attempt_number on LabReportDeliveryLog.metadata."""
    meta = dict(delivery_log.metadata or {})
    communication_id = str(report.pk)
    if not meta.get("communication_id"):
        meta["communication_id"] = communication_id
    meta["communication_attempt_id"] = str(delivery_log.pk)
    attempt_number = int((delivery_log.retry_count or 0) + 1)
    meta["attempt_number"] = attempt_number
    delivery_log.metadata = meta
    delivery_log.save(update_fields=["metadata", "updated_at"])
    return communication_id, attempt_number
