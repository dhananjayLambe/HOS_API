"""Operational report task DTOs (assignment queue context, not ORM models)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from diagnostics_engine.domain.reports import get_active_report_for_line, get_primary_artifact
from diagnostics_engine.domain.reports.report_actions import ReportAction, allowed_actions_for_report
from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticTestReport
from labs.api.services.lab_orders_presenter import (
    collection_type_from_mode,
    slot_label_for_order,
)
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_workflow import LabOrderAssignment


def map_lifecycle_to_operational(
    status: str | None,
    *,
    delivery_status: str | None = None,
) -> str:
    key = (status or "").strip().lower()
    if key == ReportLifecycleStatus.DELIVERED:
        return "DELIVERED"
    if key == ReportLifecycleStatus.REJECTED or delivery_status == DeliveryStatus.FAILED:
        return "FAILED_DELIVERY"
    if key == ReportLifecycleStatus.READY:
        return "READY_DELIVERY"
    if key == ReportLifecycleStatus.IN_PROGRESS:
        return "UPLOADED"
    return "PENDING_UPLOAD"


# Least-advanced line wins — queue tab reflects remaining work on multi-test orders.
_QUEUE_OPERATIONAL_PRIORITY = (
    "FAILED_DELIVERY",
    "PENDING_UPLOAD",
    "UPLOADED",
    "READY_DELIVERY",
    "DELIVERED",
)


def format_test_label(test_names: list[str]) -> str:
    if not test_names:
        return "Diagnostic order"
    if len(test_names) <= 2:
        return " + ".join(test_names)
    return f"{test_names[0]} + {len(test_names) - 1} more"


@dataclass(frozen=True)
class ReportLineReportDTO:
    report_id: UUID
    line_id: UUID
    test_label: str
    status: str
    delivery_status: str
    available_actions: list[str]


@dataclass(frozen=True)
class ReportUploadTargetDTO:
    report_id: UUID
    line_id: UUID
    operational_status: str


@dataclass(frozen=True)
class ReportTaskContextDTO:
    task_id: UUID
    assignment_id: UUID
    order_uuid: UUID
    order_number: str
    patient_name: str
    patient_phone: str
    encounter_id: UUID | None
    collection_type: str
    visit_or_slot_label: str
    operational_status: str
    active_reports: list[ReportLineReportDTO]
    upload_target: ReportUploadTargetDTO | None = None


@dataclass(frozen=True)
class ReportActionTargetsDTO:
    """Card-level mutation targets (first eligible active report per action)."""

    upload_report_id: UUID | None = None
    mark_ready_report_id: UUID | None = None
    send_whatsapp_report_id: UUID | None = None
    retry_delivery_log_id: UUID | None = None


@dataclass(frozen=True)
class ReportTaskDTO:
    """Queue card DTO (list endpoint / future pagination)."""

    task_id: str
    assignment_id: str
    order_uuid: str
    order_number: str
    patient_name: str
    patient_phone: str
    collection_type: str
    test_label: str
    operational_status: str
    visit_or_slot_label: str
    pending_sibling_count: int
    uploaded_at: datetime | None
    ready_at: datetime | None
    delivered_at: datetime | None
    available_action_targets: ReportActionTargetsDTO


@dataclass(frozen=True)
class ReportTaskCountsDTO:
    pending_uploads: int = 0
    ready_delivery: int = 0
    delivered: int = 0
    failed: int = 0


def _patient_phone(profile) -> str:
    if profile is None or not profile.account_id:
        return ""
    user = getattr(profile.account, "user", None)
    return getattr(user, "username", "") or ""


def _latest_failed_delivery_log_id(report: DiagnosticTestReport) -> UUID | None:
    log = (
        report.delivery_logs.filter(
            is_deleted=False,
            delivery_status=DeliveryStatus.FAILED,
        )
        .order_by("-created_at")
        .first()
    )
    return log.id if log else None


def _active_report_for_line_prefetched(line) -> DiagnosticTestReport | None:
    cache = getattr(line, "_prefetched_objects_cache", None)
    if cache and "test_reports" in cache:
        active = [
            report
            for report in cache["test_reports"]
            if report.deleted_at is None and report.supersedes_id is None
        ]
        if not active:
            return None
        active.sort(key=lambda r: (r.revision_number, r.created_at), reverse=True)
        return active[0]
    return get_active_report_for_line(line)


def _has_primary_artifact(report: DiagnosticTestReport) -> bool:
    cache = getattr(report, "_prefetched_objects_cache", None)
    if cache and "artifacts" in cache:
        return any(a.is_primary and a.is_active for a in cache["artifacts"])
    return get_primary_artifact(report) is not None


def _line_active_report_map(order) -> dict[str, DiagnosticTestReport]:
    mapped: dict[str, DiagnosticTestReport] = {}
    for line in order.test_lines.all():
        report = _active_report_for_line_prefetched(line)
        if report is not None:
            mapped[str(line.id)] = report
    return mapped


def build_available_action_targets(
    assignment: LabOrderAssignment,
    *,
    line_report_map: dict[str, DiagnosticTestReport] | None = None,
) -> ReportActionTargetsDTO:
    """Aggregate mutation targets from active report lines (first match per action)."""
    order = assignment.diagnostic_order
    upload_id: UUID | None = None
    mark_ready_id: UUID | None = None
    send_whatsapp_id: UUID | None = None
    retry_log_id: UUID | None = None

    for line in order.test_lines.all():
        report = (line_report_map or {}).get(str(line.id))
        if report is None:
            report = _active_report_for_line_prefetched(line)
        if report is None:
            continue
        actions = allowed_actions_for_report(report)
        rid = report.id
        if upload_id is None and ReportAction.UPLOAD_REPORT in actions:
            has_primary = _has_primary_artifact(report)
            awaiting_finalize = ReportAction.MARK_READY in actions
            if not (has_primary and awaiting_finalize):
                upload_id = rid
        if mark_ready_id is None and ReportAction.MARK_READY in actions:
            mark_ready_id = rid
        if send_whatsapp_id is None and ReportAction.SEND_WHATSAPP in actions:
            send_whatsapp_id = rid
        if retry_log_id is None and ReportAction.RETRY_DELIVERY in actions:
            retry_log_id = _latest_failed_delivery_log_id(report)

    return ReportActionTargetsDTO(
        upload_report_id=upload_id,
        mark_ready_report_id=mark_ready_id,
        send_whatsapp_report_id=send_whatsapp_id,
        retry_delivery_log_id=retry_log_id,
    )


def _active_reports_for_order(
    order,
    *,
    line_report_map: dict[str, DiagnosticTestReport] | None = None,
) -> list[ReportLineReportDTO]:
    rows: list[ReportLineReportDTO] = []
    for line in order.test_lines.all():
        report = (line_report_map or {}).get(str(line.id))
        if report is None:
            report = _active_report_for_line_prefetched(line)
        if report is None:
            continue
        label = line.service.name if line.service_id else "Test"
        rows.append(
            ReportLineReportDTO(
                report_id=report.id,
                line_id=line.id,
                test_label=label,
                status=report.status,
                delivery_status=report.delivery_status,
                available_actions=allowed_actions_for_report(report),
            )
        )
    return rows


def build_upload_target(
    assignment: LabOrderAssignment,
    *,
    line_report_map: dict[str, DiagnosticTestReport] | None = None,
) -> ReportUploadTargetDTO | None:
    """First active report line eligible for artifact upload (upload page target)."""
    order = assignment.diagnostic_order
    fallback: ReportUploadTargetDTO | None = None
    for line in order.test_lines.all():
        report = (line_report_map or {}).get(str(line.id))
        if report is None:
            report = _active_report_for_line_prefetched(line)
        if report is None:
            continue
        op = map_lifecycle_to_operational(
            report.status,
            delivery_status=report.delivery_status,
        )
        candidate = ReportUploadTargetDTO(
            report_id=report.id,
            line_id=line.id,
            operational_status=op,
        )
        if fallback is None:
            fallback = candidate
        if ReportAction.UPLOAD_REPORT in allowed_actions_for_report(report):
            return candidate
    return fallback


def build_report_task_context(assignment: LabOrderAssignment) -> ReportTaskContextDTO:
    order = assignment.diagnostic_order
    profile = order.patient_profile
    test_names = [
        tl.service.name for tl in order.test_lines.all() if getattr(tl, "service_id", None)
    ]
    encounter_id = None
    if order.consultation_id and order.consultation:
        enc = order.consultation.encounter
        encounter_id = enc.id if enc else None

    line_report_map = _line_active_report_map(order)
    report_status = aggregate_queue_operational_status(order, line_report_map=line_report_map)
    return ReportTaskContextDTO(
        task_id=assignment.id,
        assignment_id=assignment.id,
        order_uuid=order.id,
        order_number=order.order_number,
        patient_name=profile.get_full_name() if profile else "",
        patient_phone=_patient_phone(profile),
        encounter_id=encounter_id,
        collection_type=collection_type_from_mode(order.sample_collection_mode),
        visit_or_slot_label=slot_label_for_order(order),
        operational_status=report_status,
        active_reports=_active_reports_for_order(order, line_report_map=line_report_map),
        upload_target=build_upload_target(assignment, line_report_map=line_report_map),
    )


def build_report_task_dtos(assignments: list[LabOrderAssignment]) -> list[ReportTaskDTO]:
    """Build queue card DTOs with pending_sibling_count per patient."""
    raw: list[ReportTaskDTO] = []
    for assignment in assignments:
        raw.append(build_report_task_dto(assignment))
    pending_by_key: dict[str, int] = {}
    for dto in raw:
        if dto.operational_status == "PENDING_UPLOAD":
            key = dto.patient_phone or dto.patient_name.lower()
            pending_by_key[key] = pending_by_key.get(key, 0) + 1
    result: list[ReportTaskDTO] = []
    for dto in raw:
        key = dto.patient_phone or dto.patient_name.lower()
        count = pending_by_key.get(key, 0) if dto.operational_status == "PENDING_UPLOAD" else 0
        result.append(
            ReportTaskDTO(
                **{**dto.__dict__, "pending_sibling_count": count},
            )
        )
    return result


def build_report_task_dto(
    assignment: LabOrderAssignment,
    *,
    pending_sibling_count: int = 0,
) -> ReportTaskDTO:
    order = assignment.diagnostic_order
    profile = order.patient_profile
    test_names = [
        tl.service.name for tl in order.test_lines.all() if getattr(tl, "service_id", None)
    ]
    line_report_map = _line_active_report_map(order)
    operational_status = aggregate_queue_operational_status(order, line_report_map=line_report_map)

    uploaded_at = None
    ready_at = None
    delivered_at = None
    for line in order.test_lines.all():
        report = line_report_map.get(str(line.id))
        if report is None:
            continue
        if report.uploaded_at and (uploaded_at is None or report.uploaded_at > uploaded_at):
            uploaded_at = report.uploaded_at
        if report.ready_at and (ready_at is None or report.ready_at > ready_at):
            ready_at = report.ready_at
        if report.delivered_at and (delivered_at is None or report.delivered_at > delivered_at):
            delivered_at = report.delivered_at

    return ReportTaskDTO(
        task_id=str(assignment.id),
        assignment_id=str(assignment.id),
        order_uuid=str(order.id),
        order_number=order.order_number,
        patient_name=profile.get_full_name() if profile else "",
        patient_phone=_patient_phone(profile),
        collection_type=collection_type_from_mode(order.sample_collection_mode),
        test_label=format_test_label(test_names),
        operational_status=operational_status,
        visit_or_slot_label=slot_label_for_order(order),
        pending_sibling_count=pending_sibling_count,
        uploaded_at=uploaded_at,
        ready_at=ready_at,
        delivered_at=delivered_at,
        available_action_targets=build_available_action_targets(
            assignment,
            line_report_map=line_report_map,
        ),
    )


def aggregate_queue_operational_status(
    order,
    *,
    line_report_map: dict[str, DiagnosticTestReport] | None = None,
) -> str:
    """Bottleneck operational bucket across all active test lines."""
    line_statuses: list[str] = []
    for line in order.test_lines.all():
        report = (line_report_map or {}).get(str(line.id))
        if report is None:
            report = _active_report_for_line_prefetched(line)
        if report is None:
            line_statuses.append("PENDING_UPLOAD")
            continue
        line_statuses.append(
            map_lifecycle_to_operational(
                report.status,
                delivery_status=report.delivery_status,
            )
        )
    if not line_statuses:
        return "PENDING_UPLOAD"
    for bucket in _QUEUE_OPERATIONAL_PRIORITY:
        if bucket in line_statuses:
            return bucket
    return line_statuses[0]


def compute_report_task_counts(assignments: list[LabOrderAssignment]) -> ReportTaskCountsDTO:
    pending_uploads = 0
    ready_delivery = 0
    delivered = 0
    failed = 0

    for assignment in assignments:
        order = assignment.diagnostic_order
        status = aggregate_queue_operational_status(order, line_report_map=_line_active_report_map(order))
        if status == "PENDING_UPLOAD":
            pending_uploads += 1
        elif status == "READY_DELIVERY":
            ready_delivery += 1
        elif status == "DELIVERED":
            delivered += 1
        elif status == "FAILED_DELIVERY":
            failed += 1

    return ReportTaskCountsDTO(
        pending_uploads=pending_uploads,
        ready_delivery=ready_delivery,
        delivered=delivered,
        failed=failed,
    )
