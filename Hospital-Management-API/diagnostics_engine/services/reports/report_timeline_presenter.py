"""Read-only report lifecycle timeline DTOs for lab operational UI."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from consultations_core.models.audit import ClinicalAuditLog
from django.utils import timezone

from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.services.reports.report_history_presenter import _active_delivery_logs
from diagnostics_engine.services.reports.report_query_service import ReportQueryService
from diagnostics_engine.services.reports.report_task_presenter import _sample_collected_at_for_order
from labs.choices.tracking import DeliveryStatus


class ReportTimelineEventType:
    COLLECTED = "collected"
    UPLOAD_COMPLETED = "upload_completed"
    ARTIFACT_REUPLOADED = "artifact_reuploaded"
    READY_TO_SEND = "ready_to_send"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    ATTENTION_REQUIRED = "attention_required"


_AUDIT_ACTION_TO_EVENT_TYPE: dict[str, str] = {
    "artifact_uploaded": ReportTimelineEventType.UPLOAD_COMPLETED,
    "artifact_replaced": ReportTimelineEventType.ARTIFACT_REUPLOADED,
    "report_reuploaded": ReportTimelineEventType.ARTIFACT_REUPLOADED,
    "report_ready": ReportTimelineEventType.READY_TO_SEND,
    "delivery_sent": ReportTimelineEventType.SENT,
}

_REUPLOAD_DEDUPE_WINDOW = timedelta(seconds=2)


@dataclass(frozen=True)
class ReportTimelineEventDTO:
    event_type: str
    timestamp: datetime
    actor_name: str
    message: str


@dataclass(frozen=True)
class ReportTimelineDTO:
    report_id: UUID
    events: list[ReportTimelineEventDTO]


def build_report_timeline_dto(report: DiagnosticTestReport) -> ReportTimelineDTO:
    """Compose ascending lifecycle timeline from audit, artifacts, and delivery logs."""
    candidates: list[ReportTimelineEventDTO] = []
    candidates.extend(_collected_events(report))
    candidates.extend(_audit_events(report))
    candidates.extend(_structural_fallback_events(report, candidates))
    events = _dedupe_and_sort(candidates)
    return ReportTimelineDTO(report_id=report.id, events=events)


def _collected_events(report: DiagnosticTestReport) -> list[ReportTimelineEventDTO]:
    order = getattr(getattr(report, "order_test_line", None), "order", None)
    if order is None:
        return []
    collected_at = _sample_collected_at_for_order(order)
    if collected_at is None:
        return []
    return [
        ReportTimelineEventDTO(
            event_type=ReportTimelineEventType.COLLECTED,
            timestamp=collected_at,
            actor_name="",
            message="",
        )
    ]


def _audit_events(report: DiagnosticTestReport) -> list[ReportTimelineEventDTO]:
    logs = (
        ClinicalAuditLog.objects.filter(
            object_type=report.__class__.__name__,
            object_id=report.pk,
            field_name="action",
        )
        .select_related("changed_by")
        .order_by("created_at")
    )
    artifacts = list(ReportQueryService.get_active_artifacts(report=report))
    events: list[ReportTimelineEventDTO] = []
    for log in logs:
        event_type = _AUDIT_ACTION_TO_EVENT_TYPE.get(log.new_value)
        if event_type is None:
            continue
        metadata = _parse_audit_metadata(log.reason)
        actor_name = _actor_name(log)
        message = _message_for_audit_event(
            event_type=event_type,
            metadata=metadata,
            artifacts=artifacts,
            report=report,
            timestamp=log.created_at,
        )
        events.append(
            ReportTimelineEventDTO(
                event_type=event_type,
                timestamp=log.created_at,
                actor_name=actor_name,
                message=message,
            )
        )
    return events


def _structural_fallback_events(
    report: DiagnosticTestReport,
    existing: list[ReportTimelineEventDTO],
) -> list[ReportTimelineEventDTO]:
    """Fill gaps when audit rows are missing (older data)."""
    events: list[ReportTimelineEventDTO] = []
    existing_types_at = {(e.event_type, _bucket_ts(e.timestamp)) for e in existing}

    artifacts = list(ReportQueryService.get_active_artifacts(report=report))
    for artifact in sorted(artifacts, key=lambda a: a.uploaded_at or timezone.now()):
        if artifact.uploaded_at is None:
            continue
        bucket = _bucket_ts(artifact.uploaded_at)
        upload_key = (ReportTimelineEventType.UPLOAD_COMPLETED, bucket)
        reupload_key = (ReportTimelineEventType.ARTIFACT_REUPLOADED, bucket)
        if upload_key in existing_types_at or reupload_key in existing_types_at:
            continue
        is_reupload = bool(artifact.reupload_reason) or (artifact.version or 1) > 1
        event_type = (
            ReportTimelineEventType.ARTIFACT_REUPLOADED
            if is_reupload
            else ReportTimelineEventType.UPLOAD_COMPLETED
        )
        message = (
            artifact.reupload_reason or "Previous file replaced"
            if is_reupload
            else f"Uploaded {artifact.original_filename}"
        )
        events.append(
            ReportTimelineEventDTO(
                event_type=event_type,
                timestamp=artifact.uploaded_at,
                actor_name="",
                message=message,
            )
        )
        existing_types_at.add((event_type, bucket))

    if report.ready_at and (ReportTimelineEventType.READY_TO_SEND, _bucket_ts(report.ready_at)) not in existing_types_at:
        events.append(
            ReportTimelineEventDTO(
                event_type=ReportTimelineEventType.READY_TO_SEND,
                timestamp=report.ready_at,
                actor_name="",
                message="",
            )
        )

    for log in _active_delivery_logs(report):
        if log.sent_at and (ReportTimelineEventType.SENT, _bucket_ts(log.sent_at)) not in existing_types_at:
            events.append(
                ReportTimelineEventDTO(
                    event_type=ReportTimelineEventType.SENT,
                    timestamp=log.sent_at,
                    actor_name="",
                    message="",
                )
            )
            existing_types_at.add((ReportTimelineEventType.SENT, _bucket_ts(log.sent_at)))

        if log.delivered_at and (ReportTimelineEventType.DELIVERED, _bucket_ts(log.delivered_at)) not in existing_types_at:
            events.append(
                ReportTimelineEventDTO(
                    event_type=ReportTimelineEventType.DELIVERED,
                    timestamp=log.delivered_at,
                    actor_name="",
                    message="",
                )
            )
            existing_types_at.add((ReportTimelineEventType.DELIVERED, _bucket_ts(log.delivered_at)))

        if log.delivery_status == DeliveryStatus.FAILED:
            ts = log.updated_at or log.created_at
            bucket = _bucket_ts(ts)
            if (ReportTimelineEventType.FAILED, bucket) not in existing_types_at:
                events.append(
                    ReportTimelineEventDTO(
                        event_type=ReportTimelineEventType.FAILED,
                        timestamp=ts,
                        actor_name="",
                        message=(log.failure_reason or "").strip(),
                    )
                )
                existing_types_at.add((ReportTimelineEventType.FAILED, bucket))

    return events


def _dedupe_and_sort(events: list[ReportTimelineEventDTO]) -> list[ReportTimelineEventDTO]:
    if not events:
        return []

    sorted_events = sorted(events, key=lambda e: (e.timestamp, e.event_type))
    deduped: list[ReportTimelineEventDTO] = []

    for event in sorted_events:
        if _should_skip_reupload_duplicate(deduped, event):
            continue
        if deduped and _is_duplicate_delivery_milestone(deduped[-1], event):
            continue
        deduped.append(event)

    return deduped


def _should_skip_reupload_duplicate(
    existing: list[ReportTimelineEventDTO],
    candidate: ReportTimelineEventDTO,
) -> bool:
    if candidate.event_type != ReportTimelineEventType.ARTIFACT_REUPLOADED:
        return False
    for prior in reversed(existing):
        if prior.event_type != ReportTimelineEventType.ARTIFACT_REUPLOADED:
            break
        if abs(prior.timestamp - candidate.timestamp) <= _REUPLOAD_DEDUPE_WINDOW:
            # Prefer event with actor/message (typically report_reuploaded audit).
            if candidate.message and not prior.message:
                existing.remove(prior)
                return False
            if candidate.actor_name and not prior.actor_name:
                existing.remove(prior)
                return False
            return True
    return False


def _is_duplicate_delivery_milestone(
    prior: ReportTimelineEventDTO,
    candidate: ReportTimelineEventDTO,
) -> bool:
    if prior.event_type != candidate.event_type:
        return False
    if candidate.event_type not in {
        ReportTimelineEventType.SENT,
        ReportTimelineEventType.DELIVERED,
        ReportTimelineEventType.FAILED,
    }:
        return False
    return abs(prior.timestamp - candidate.timestamp) <= _REUPLOAD_DEDUPE_WINDOW


def _parse_audit_metadata(reason: str | None) -> dict:
    if not reason:
        return {}
    try:
        parsed = json.loads(reason)
    except (json.JSONDecodeError, TypeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _actor_name(log: ClinicalAuditLog) -> str:
    user = log.changed_by
    if user is None:
        return ""
    return getattr(user, "username", "") or ""


def _message_for_audit_event(
    *,
    event_type: str,
    metadata: dict,
    artifacts: list[DiagnosticReportArtifact],
    report: DiagnosticTestReport,
    timestamp: datetime,
) -> str:
    if event_type == ReportTimelineEventType.UPLOAD_COMPLETED:
        filename = _artifact_filename_near(artifacts, timestamp) or _first_artifact_filename(artifacts)
        return f"Uploaded {filename}" if filename else "Report uploaded"

    if event_type == ReportTimelineEventType.ARTIFACT_REUPLOADED:
        reason = (metadata.get("reason") or report.last_reupload_reason or "").strip()
        return reason or "Previous file replaced"

    if event_type == ReportTimelineEventType.READY_TO_SEND:
        notes = (metadata.get("notes") or "").strip()
        return notes

    if event_type == ReportTimelineEventType.FAILED:
        return (metadata.get("reason") or "").strip()

    return ""


def _artifact_filename_near(
    artifacts: list[DiagnosticReportArtifact],
    timestamp: datetime,
) -> str | None:
    window = timedelta(minutes=5)
    matches = [
        a
        for a in artifacts
        if a.uploaded_at and abs(a.uploaded_at - timestamp) <= window
    ]
    if not matches:
        return None
    matches.sort(key=lambda a: abs(a.uploaded_at - timestamp))
    return matches[0].original_filename


def _first_artifact_filename(artifacts: list[DiagnosticReportArtifact]) -> str | None:
    primary = next((a for a in artifacts if a.is_primary), None)
    if primary:
        return primary.original_filename
    return artifacts[0].original_filename if artifacts else None


def _bucket_ts(ts: datetime) -> int:
    return int(ts.timestamp())
