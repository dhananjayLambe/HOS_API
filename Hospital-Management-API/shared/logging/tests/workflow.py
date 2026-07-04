"""Simulated diagnostic booking workflow for Correlation Framework certification.

This module is test-only. It models the patient journey without depending on
application service implementations.
"""

from __future__ import annotations

from celery import shared_task

from shared.logging import LogModule
from shared.logging.context import get_context_manager
from shared.logging.logger import Logger


WORKFLOW_ACTIONS = (
    "api.request_received",
    "authentication.verified",
    "recommendation.generated",
    "booking.submitted",
    "booking.confirmed",
    "celery.task_started",
    "whatsapp.notification_queued",
    "whatsapp.notification_sent",
    "laboratory.processing_started",
    "report.upload_started",
    "report.upload_completed",
    "whatsapp.patient_notified",
    "workflow.completed",
)


def _log(
    logger: Logger,
    message: str,
    *,
    module: LogModule,
    action: str,
    **context_updates: str,
) -> None:
    if context_updates:
        get_context_manager().update(**context_updates)
    logger.info(message, module=module, action=action)


@shared_task(name="logging_cert.notification_pipeline")
def notification_pipeline_task() -> dict[str, str | None]:
    """Background notification + laboratory + report steps."""
    from shared.logging import logger

    manager = get_context_manager()
    _log(
        logger,
        "Celery notification task started",
        module=LogModule.CELERY,
        action="celery.task_started",
    )
    _log(
        logger,
        "WhatsApp notification queued",
        module=LogModule.WHATSAPP,
        action="whatsapp.notification_queued",
        whatsapp_message_id="WA-CERT-001",
    )
    _log(
        logger,
        "WhatsApp notification sent",
        module=LogModule.WHATSAPP,
        action="whatsapp.notification_sent",
    )
    _log(
        logger,
        "Laboratory processing started",
        module=LogModule.LABORATORY,
        action="laboratory.processing_started",
        laboratory_id="LAB-CERT-001",
    )
    _log(
        logger,
        "Report upload started",
        module=LogModule.REPORTS,
        action="report.upload_started",
        report_id="RPT-CERT-001",
    )
    _log(
        logger,
        "Report upload completed",
        module=LogModule.REPORTS,
        action="report.upload_completed",
    )
    _log(
        logger,
        "Patient notified of report",
        module=LogModule.WHATSAPP,
        action="whatsapp.patient_notified",
    )
    context = manager.get()
    return {
        "correlation_id": context.correlation_id,
        "request_id": context.request_id,
        "booking_id": context.booking_id,
        "report_id": context.report_id,
    }


@shared_task(
    name="logging_cert.fail_once_then_succeed",
    bind=True,
    autoretry_for=(ValueError,),
    retry_kwargs={"max_retries": 1, "countdown": 0},
)
def fail_once_then_succeed_task(self) -> dict[str, str | None]:
    """Fail once then succeed, preserving correlation across retry."""
    from shared.logging import logger

    attempts = getattr(fail_once_then_succeed_task, "_attempts", 0) + 1
    fail_once_then_succeed_task._attempts = attempts
    context = get_context_manager().get()
    logger.info(
        "Retryable background step",
        module=LogModule.CELERY,
        action="celery.retry_step",
    )
    if attempts == 1:
        raise ValueError("transient failure")
    return {
        "correlation_id": context.correlation_id,
        "request_id": context.request_id,
        "attempts": str(attempts),
    }


@shared_task(name="logging_cert.fail_with_log")
def fail_with_log_task() -> None:
    """Log then fail permanently for failure-path certification."""
    from shared.logging import logger

    logger.error(
        "Background task failed",
        module=LogModule.CELERY,
        action="celery.failed",
    )
    raise RuntimeError("worker failure")


def run_api_workflow(logger: Logger) -> dict[str, str | None]:
    """Execute the synchronous API portion of the diagnostic booking workflow."""
    manager = get_context_manager()
    _log(
        logger,
        "HTTP request received",
        module=LogModule.API,
        action="api.request_received",
    )
    _log(
        logger,
        "Authentication verified",
        module=LogModule.AUTHENTICATION,
        action="authentication.verified",
        user_id="USR-CERT-001",
        user_role="patient",
    )
    _log(
        logger,
        "Recommendation generated",
        module=LogModule.RECOMMENDATION,
        action="recommendation.generated",
        recommendation_id="REC-CERT-001",
        patient_account_id="PAT-CERT-001",
    )
    _log(
        logger,
        "Diagnostic booking submitted",
        module=LogModule.BOOKING,
        action="booking.submitted",
        booking_id="BK-CERT-001",
    )
    _log(
        logger,
        "Booking confirmed",
        module=LogModule.BOOKING,
        action="booking.confirmed",
    )
    # Snapshot publisher context before the worker runs. In eager mode the
    # worker shares this process's ContextVar and clears it on task_postrun;
    # production workers run in a separate process and do not affect the API.
    publisher_context = manager.get()
    result = notification_pipeline_task.delay().get()
    manager.set(publisher_context)
    _log(
        logger,
        "Diagnostic booking workflow completed",
        module=LogModule.API,
        action="workflow.completed",
    )
    context = manager.get()
    return {
        "correlation_id": context.correlation_id,
        "request_id": context.request_id,
        "booking_id": context.booking_id,
        "celery_correlation_id": result["correlation_id"],
        "report_id": result["report_id"],
    }
