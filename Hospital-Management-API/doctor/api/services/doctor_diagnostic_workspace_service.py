"""Doctor Diagnostic Workspace orchestration service (Phase 1)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.utils import timezone

from diagnostics_engine.domain.reports.active_report import active_reports_queryset, get_primary_artifact
from diagnostics_engine.models.choices import OrderTestLineStatus, ReportLifecycleStatus
from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from diagnostics_engine.models.reports import DiagnosticTestReport
from doctor.api.services.dashboard_report_queries import (
    get_doctor_clinic_line_scope_filter,
    get_doctor_clinic_scope_filter,
    get_pending_upload_queryset,
    get_ready_reports_queryset,
)
from patient_account.models import PatientProfile


def _iso(value):
    return value.isoformat() if value else None


def _patient_age(profile) -> int | None:
    if not profile:
        return None
    if getattr(profile, "age", None) is not None:
        return int(profile.age)
    if getattr(profile, "age_years", None) is not None:
        return int(profile.age_years)
    return None


class ClinicalStatusMapper:
    """Maps storage lifecycle + revision to stable clinical statuses."""

    @staticmethod
    def for_report(report: DiagnosticTestReport) -> str:
        if (report.revision_number or 1) > 1 or report.supersedes_id:
            return "UPDATED"
        return "AVAILABLE"


class WorkspacePermissionService:
    """Permission scoping hook layer."""

    @staticmethod
    def report_scope(*, doctor_id, clinic_id):
        return get_doctor_clinic_scope_filter(doctor_id=doctor_id, clinic_id=clinic_id)

    @staticmethod
    def line_scope(*, doctor_id, clinic_id):
        return get_doctor_clinic_line_scope_filter(doctor_id=doctor_id, clinic_id=clinic_id)


class ArtifactService:
    """Artifact formatting and URL helpers."""

    @staticmethod
    def to_dto(artifact) -> dict[str, Any]:
        kind = artifact.artifact_type if artifact.artifact_type in ("PDF", "IMAGE") else "OTHER"
        download_url = f"/api/v1/doctors/diagnostic-workspace/reports/{artifact.report_id}/artifacts/{artifact.id}/download/"
        preview_url = artifact.file.url if artifact.file else None
        return {
            "id": str(artifact.id),
            "label": artifact.download_filename or artifact.original_filename or f"Artifact {artifact.id}",
            "artifact_type": kind,
            "preview_url": preview_url,
            "download_url": download_url,
            "is_primary": bool(artifact.is_primary),
        }


@dataclass
class ClinicalReportService:
    doctor_id: Any
    clinic_id: Any

    def _patient_context(self, patient, order) -> dict[str, Any]:
        consultation = getattr(order, "consultation", None)
        return {
            "id": str(patient.id),
            "name": patient.get_full_name().strip(),
            "age": _patient_age(patient),
            "gender": patient.gender or "",
            "identifier": patient.public_id or "",
            "mobile": getattr(getattr(patient, "account", None), "user", None).username
            if getattr(getattr(patient, "account", None), "user", None)
            else None,
            "last_visit_at": _iso(getattr(order, "created_at", None)),
            "current_consultation_id": str(consultation.id) if consultation else None,
            "current_consultation_label": f"Consultation {consultation.id}" if consultation else None,
        }

    def _report_summary(self, report: DiagnosticTestReport) -> dict[str, Any]:
        line = report.order_test_line
        order = line.order
        patient = order.patient_profile
        encounter = getattr(order, "encounter", None)
        service = getattr(line, "service", None)
        primary = get_primary_artifact(report)
        return {
            "id": str(report.id),
            "report_number": report.report_number,
            "patient": self._patient_context(patient, order),
            "test_name": service.name if service else "Diagnostic report",
            "category": getattr(service, "category", None),
            "lab_name": getattr(getattr(order, "branch", None), "name", None),
            "branch_name": getattr(getattr(order, "branch", None), "name", None),
            "doctor_name": getattr(getattr(order, "doctor", None), "name", None),
            "consultation_id": str(order.consultation_id) if order.consultation_id else None,
            "consultation_label": f"Consultation {order.consultation_id}" if order.consultation_id else None,
            "encounter_id": str(encounter.id) if encounter else None,
            "collection_date": _iso(order.collected_at),
            "report_date": _iso(report.ready_at or (primary.uploaded_at if primary else None)),
            "uploaded_at": _iso(report.uploaded_at),
            "clinical_status": ClinicalStatusMapper.for_report(report),
            "clinical_findings_preview": (
                str(report.structured_result)[:120] if report.structured_result else None
            ),
        }

    def _awaiting_summary(self, line: DiagnosticOrderTestLine) -> dict[str, Any]:
        order = line.order
        patient = order.patient_profile
        service = getattr(line, "service", None)
        encounter = getattr(order, "encounter", None)
        return {
            "id": f"awaiting:{line.id}",
            "report_number": None,
            "patient": self._patient_context(patient, order),
            "test_name": service.name if service else "Diagnostic report",
            "category": getattr(service, "category", None),
            "lab_name": getattr(getattr(order, "branch", None), "name", None),
            "branch_name": getattr(getattr(order, "branch", None), "name", None),
            "doctor_name": getattr(getattr(order, "doctor", None), "name", None),
            "consultation_id": str(order.consultation_id) if order.consultation_id else None,
            "consultation_label": f"Consultation {order.consultation_id}" if order.consultation_id else None,
            "encounter_id": str(encounter.id) if encounter else None,
            "collection_date": _iso(order.collected_at),
            "report_date": None,
            "uploaded_at": None,
            "clinical_status": "AWAITING_REPORT",
            "clinical_findings_preview": None,
        }

    def _apply_filters(self, rows: list[dict[str, Any]], *, q=None, filters=None, status=None):
        query = (q or "").strip().lower()
        if query:
            rows = [
                row
                for row in rows
                if query
                in " ".join(
                    [
                        row["patient"]["name"] or "",
                        row["patient"]["identifier"] or "",
                        row["patient"]["mobile"] or "",
                        row["test_name"] or "",
                        row["report_number"] or "",
                    ]
                ).lower()
            ]
        f = filters or {}
        if f.get("lab"):
            rows = [r for r in rows if r.get("lab_name") == f["lab"]]
        if f.get("category"):
            rows = [r for r in rows if r.get("category") == f["category"]]
        if f.get("doctor"):
            rows = [r for r in rows if r.get("doctor_name") == f["doctor"]]
        if f.get("branch"):
            rows = [r for r in rows if r.get("branch_name") == f["branch"]]
        if status:
            rows = [r for r in rows if r["clinical_status"] == status]
        return rows

    def list_reports(self, *, q=None, queue=None, quick_filter=None, filters=None, page=1, page_size=25):
        ready_reports = [self._report_summary(r) for r in get_ready_reports_queryset(doctor_id=self.doctor_id, clinic_id=self.clinic_id)]
        awaiting_reports = [self._awaiting_summary(l) for l in get_pending_upload_queryset(doctor_id=self.doctor_id, clinic_id=self.clinic_id)]
        rows = ready_reports + awaiting_reports
        if queue == "reports_ready" or quick_filter == "reports_ready":
            rows = [r for r in rows if r["clinical_status"] in ("AVAILABLE", "UPDATED")]
        elif queue == "awaiting" or quick_filter == "awaiting":
            rows = [r for r in rows if r["clinical_status"] == "AWAITING_REPORT"]
        elif quick_filter == "today":
            today = timezone.localdate().isoformat()
            rows = [r for r in rows if (r["uploaded_at"] or "")[:10] == today]
        rows = self._apply_filters(rows, q=q, filters=filters, status=(filters or {}).get("status"))
        rows.sort(key=lambda r: r.get("report_date") or r.get("uploaded_at") or "", reverse=True)
        start = max((int(page) - 1) * int(page_size), 0)
        end = start + int(page_size)
        return {"reports": rows[start:end], "next_cursor": str(page + 1) if end < len(rows) else None}

    def queue_counts(self, *, q=None):
        ready = [self._report_summary(r) for r in get_ready_reports_queryset(doctor_id=self.doctor_id, clinic_id=self.clinic_id)]
        awaiting = [self._awaiting_summary(l) for l in get_pending_upload_queryset(doctor_id=self.doctor_id, clinic_id=self.clinic_id)]
        rows = self._apply_filters(ready + awaiting, q=q)
        return {
            "reports_ready": sum(1 for r in rows if r["clinical_status"] in ("AVAILABLE", "UPDATED")),
            "awaiting": sum(1 for r in rows if r["clinical_status"] == "AWAITING_REPORT"),
            "critical": 0,
        }

    def search_patients(self, *, q: str):
        needle = q.strip()
        if not needle:
            return []
        profile_ids = (
            PatientProfile.objects.filter(diagnostic_orders__test_lines__test_reports__deleted_at__isnull=True)
            .filter(
                WorkspacePermissionService.report_scope(
                    doctor_id=self.doctor_id,
                    clinic_id=self.clinic_id,
                )
            )
            .distinct()
        )
        rows = []
        n = needle.lower()
        for profile in profile_ids[:25]:
            label = f"{profile.get_full_name()} {profile.public_id or ''}".lower()
            if n not in label:
                continue
            last_order = (
                profile.diagnostic_orders.filter(
                    WorkspacePermissionService.line_scope(doctor_id=self.doctor_id, clinic_id=self.clinic_id)
                )
                .order_by("-created_at")
                .first()
            )
            rows.append(self._patient_context(profile, last_order) if last_order else {
                "id": str(profile.id),
                "name": profile.get_full_name().strip(),
                "age": _patient_age(profile),
                "gender": profile.gender or "",
                "identifier": profile.public_id or "",
                "mobile": None,
                "last_visit_at": None,
                "current_consultation_id": None,
                "current_consultation_label": None,
            })
        return rows

    def get_report_detail(self, *, report_id):
        report = (
            active_reports_queryset()
            .filter(id=report_id)
            .filter(WorkspacePermissionService.report_scope(doctor_id=self.doctor_id, clinic_id=self.clinic_id))
            .select_related(
                "order_test_line__order__patient_profile",
                "order_test_line__order__branch",
                "order_test_line__order__doctor",
                "order_test_line__order__consultation",
                "order_test_line__service",
            )
            .prefetch_related("artifacts")
            .first()
        )
        if not report:
            return None
        summary = self._report_summary(report)
        order = report.order_test_line.order
        artifacts = [
            ArtifactService.to_dto(artifact)
            for artifact in report.artifacts.filter(is_active=True).order_by("-is_primary", "-uploaded_at")
        ]
        summary.update(
            {
                "artifacts": artifacts,
                "timeline": {
                    "ordered_at": _iso(order.created_at),
                    "collected_at": _iso(order.collected_at),
                    "uploaded_at": _iso(report.uploaded_at),
                },
                "clinical_findings": str(report.structured_result) if report.structured_result else None,
            }
        )
        return summary


class DoctorDiagnosticWorkspaceService:
    """Single orchestration entry-point."""

    def __init__(self, *, doctor_id, clinic_id):
        self.reports = ClinicalReportService(doctor_id=doctor_id, clinic_id=clinic_id)

    def search_patients(self, *, q: str):
        return self.reports.search_patients(q=q)

    def get_queue_counts(self, *, q=None):
        return self.reports.queue_counts(q=q)

    def list_reports(self, **kwargs):
        return self.reports.list_reports(**kwargs)

    def get_report_detail(self, *, report_id):
        return self.reports.get_report_detail(report_id=report_id)
