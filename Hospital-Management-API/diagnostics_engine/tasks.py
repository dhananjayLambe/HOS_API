from __future__ import annotations

from celery import shared_task
from django.core.cache import cache
from django.db.models import Count

from diagnostics_engine.models import DiagnosisTestMapping, DiagnosticOrderItem


@shared_task
def update_doctor_stats() -> dict:
    rows = (
        DiagnosticOrderItem.objects.filter(service_id__isnull=False, deleted_at__isnull=True)
        .values("order__doctor_id", "service_id")
        .annotate(cnt=Count("id"))
    )
    grouped: dict[str, dict[str, int]] = {}
    for row in rows:
        doctor_id = str(row["order__doctor_id"])
        grouped.setdefault(doctor_id, {})[str(row["service_id"])] = int(row["cnt"] or 0)
    for doctor_id, payload in grouped.items():
        cache.set(f"inv_stats:doctor:{doctor_id}", payload, timeout=60 * 60)
    return {"doctor_count": len(grouped)}


@shared_task
def update_global_stats() -> dict:
    rows = (
        DiagnosticOrderItem.objects.filter(service_id__isnull=False, deleted_at__isnull=True)
        .values("service_id")
        .annotate(cnt=Count("id"))
    )
    payload = {str(r["service_id"]): int(r["cnt"] or 0) for r in rows}
    cache.set("inv_stats:global:test_freq", payload, timeout=6 * 60 * 60)
    return {"service_count": len(payload)}


@shared_task
def update_diagnosis_mapping() -> dict:
    rows = DiagnosisTestMapping.objects.filter(is_active=True).values("diagnosis_id", "service_id", "rule_type", "weight")
    payload: dict[str, list[dict]] = {}
    for row in rows:
        did = str(row["diagnosis_id"])
        payload.setdefault(did, []).append(
            {
                "service_id": str(row["service_id"]),
                "rule_type": row["rule_type"],
                "weight": float(row["weight"]),
            }
        )
    cache.set("inv_stats:diagnosis_map", payload, timeout=6 * 60 * 60)
    return {"diagnosis_count": len(payload)}


# ---------------------------------------------------------------------------
# Report delivery tasks (Phase 1)
# ---------------------------------------------------------------------------

import logging

from django.core.exceptions import ValidationError

from diagnostics_engine.services.reports.report_delivery_service import ReportDeliveryService
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog

_report_logger = logging.getLogger("diagnostics.reports")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def deliver_report_whatsapp(self, delivery_log_id: str) -> None:
    """Send prepared delivery log via provider; idempotent on terminal log states."""
    try:
        log = LabReportDeliveryLog.objects.select_related(
            "diagnostic_test_report",
        ).get(pk=delivery_log_id, is_deleted=False)
    except LabReportDeliveryLog.DoesNotExist:
        _report_logger.warning("delivery_task_missing log_id=%s", delivery_log_id)
        return

    if log.delivery_status in (DeliveryStatus.SENT, DeliveryStatus.DELIVERED, DeliveryStatus.VIEWED):
        _report_logger.info(
            "delivery_task_skip_terminal log_id=%s status=%s",
            log.id,
            log.delivery_status,
        )
        return

    try:
        ReportDeliveryService.execute_delivery_send(delivery_log=log)
    except ValidationError as exc:
        _report_logger.warning("delivery_task_failed log_id=%s err=%s", log.id, exc)
        ReportDeliveryService.mark_delivery_failed(delivery_log=log, reason=str(exc))
        raise self.retry(exc=exc) from exc


@shared_task
def notify_doctor_report_ready(report_id: str) -> None:
    """Stub: enqueue doctor notification when report is marked ready."""
    from diagnostics_engine.models.reports import DiagnosticTestReport

    try:
        report = DiagnosticTestReport.objects.get(pk=report_id)
    except DiagnosticTestReport.DoesNotExist:
        return
    _report_logger.info("doctor_notify_stub report_id=%s", report.id)


@shared_task
def on_report_finalized(report_id: str) -> None:
    """Fan-out after mark-ready."""
    notify_doctor_report_ready.delay(report_id)

