"""WorkspaceResponseMapper — only layer that converts domain/ORM shapes → DTOs.

Accepts duck-typed / prefetched objects (ORM allowed at runtime).
Does not run queries, permissions, or clinical status derivation.
Status must be supplied as a precomputed clinical_status string
(from ClinicalStatusMapper) or use ClinicalStatusMapper.awaiting() for pending rows.
"""

from __future__ import annotations

from typing import Any, Iterable, Sequence

from doctor_report_workspace.dto import (
    WorkspaceArtifactDTO,
    WorkspaceFiltersDTO,
    WorkspaceFiltersResponseDTO,
    WorkspaceListResponseDTO,
    WorkspacePaginationDTO,
    WorkspacePatientContextDTO,
    WorkspaceReportDTO,
    WorkspaceReportDetailDTO,
    WorkspaceSummaryDTO,
    WorkspaceSummaryResponseDTO,
    WorkspaceTimelineDTO,
)


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _str_id(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _patient_age(patient: Any) -> int | None:
    age = getattr(patient, "age", None)
    if age is not None:
        try:
            return int(age)
        except (TypeError, ValueError):
            pass
    age_years = getattr(patient, "age_years", None)
    if age_years is not None:
        try:
            return int(age_years)
        except (TypeError, ValueError):
            return None
    return None


def _patient_mobile(patient: Any) -> str | None:
    account = getattr(patient, "account", None)
    user = getattr(account, "user", None) if account is not None else None
    username = getattr(user, "username", None) if user is not None else None
    if username:
        return str(username)
    return None


def _patient_name(patient: Any) -> str:
    get_full_name = getattr(patient, "get_full_name", None)
    if callable(get_full_name):
        return (get_full_name() or "").strip()
    first = getattr(patient, "first_name", "") or ""
    last = getattr(patient, "last_name", "") or ""
    return f"{first} {last}".strip()


def _findings_preview(structured: Any, *, limit: int = 120) -> str | None:
    if structured is None:
        return None
    text = str(structured).strip()
    if not text:
        return None
    return text[:limit]


def _findings_full(structured: Any) -> str | None:
    if structured is None:
        return None
    text = str(structured).strip()
    return text or None


def _service_category_label(service: Any) -> str | None:
    if service is None:
        return None
    category = getattr(service, "category", None)
    if category is None:
        return None
    return (
        getattr(category, "code", None)
        or getattr(category, "name", None)
        or str(category)
    )


class WorkspaceResponseMapper:
    """Maps prefetched report/patient/artifact shapes to frozen Phase 1 DTOs."""

    @classmethod
    def map(cls, row: Any, *, clinical_status: str) -> WorkspaceReportDTO:
        """Single entrypoint for WorkspaceRow → WorkspaceReportDTO.

        Call sites must not branch on awaiting vs report; pass precomputed status.
        """
        kind = getattr(row, "kind", None)
        if kind == "awaiting":
            return cls._map_awaiting_row(row.source, clinical_status=clinical_status)
        if kind == "report":
            return cls.to_report_from_report_object(
                row.source,
                clinical_status=clinical_status,
            )
        # Duck-typed fallback: report-like object
        return cls.to_report_from_report_object(row, clinical_status=clinical_status)

    @classmethod
    def _map_awaiting_row(cls, line: Any, *, clinical_status: str) -> WorkspaceReportDTO:
        order = getattr(line, "order", None)
        patient = getattr(order, "patient_profile", None) if order is not None else None
        service = getattr(line, "service", None)
        branch = getattr(order, "branch", None) if order is not None else None
        doctor = getattr(order, "doctor", None) if order is not None else None
        encounter = getattr(order, "encounter", None) if order is not None else None
        consultation_id = getattr(order, "consultation_id", None) if order is not None else None
        consultation_label = f"Consultation {consultation_id}" if consultation_id else None
        doctor_name = None
        if doctor is not None:
            doctor_name = getattr(doctor, "name", None) or getattr(doctor, "full_name", None)
        return cls.to_report(
            report_id=getattr(line, "id"),
            clinical_status=clinical_status,
            patient=patient,
            test_name=getattr(service, "name", None) or "Diagnostic report",
            report_number=None,
            category=_service_category_label(service),
            lab_name=getattr(branch, "branch_name", None) or getattr(branch, "name", None),
            branch_name=getattr(branch, "branch_name", None) or getattr(branch, "name", None),
            doctor_name=doctor_name,
            consultation_id=consultation_id,
            consultation_label=consultation_label,
            encounter_id=getattr(encounter, "id", None) if encounter is not None else None,
            collection_date=getattr(order, "collected_at", None) if order is not None else None,
            report_date=None,
            uploaded_at=None,
            last_visit_at=getattr(order, "created_at", None) if order is not None else None,
            structured_result=None,
        )

    @staticmethod
    def to_patient_context(
        patient: Any,
        *,
        last_visit_at: Any = None,
        current_consultation_id: Any = None,
        current_consultation_label: str | None = None,
    ) -> WorkspacePatientContextDTO:
        return WorkspacePatientContextDTO(
            id=str(getattr(patient, "id")),
            name=_patient_name(patient),
            age=_patient_age(patient),
            gender=str(getattr(patient, "gender", "") or ""),
            identifier=str(getattr(patient, "public_id", "") or ""),
            mobile=_patient_mobile(patient),
            last_visit_at=_iso(last_visit_at),
            current_consultation_id=_str_id(current_consultation_id),
            current_consultation_label=current_consultation_label,
        )

    @staticmethod
    def to_artifact_from_presentation(
        presentation: Any,
        *,
        preview_url: str | None = None,
        download_url: str | None = None,
    ) -> WorkspaceArtifactDTO:
        """Structural ArtifactPresentation → DTO. No sort/select/label logic.

        Phase 1: preview_url defaults to None, download_url to "".
        Future ArtifactAccessService may supply opaque URL overrides.
        """
        resolved_download = download_url if download_url is not None else ""
        return WorkspaceArtifactDTO(
            id=str(getattr(presentation, "artifact_id")),
            label=str(getattr(presentation, "label")),
            artifact_type=str(getattr(presentation, "artifact_type")),
            preview_url=preview_url,
            download_url=str(resolved_download),
            is_primary=bool(getattr(presentation, "is_primary", False)),
        )

    @staticmethod
    def to_timeline(
        *,
        ordered_at: Any = None,
        collected_at: Any = None,
        uploaded_at: Any = None,
    ) -> WorkspaceTimelineDTO:
        return WorkspaceTimelineDTO(
            ordered_at=_iso(ordered_at),
            collected_at=_iso(collected_at),
            uploaded_at=_iso(uploaded_at),
        )

    @classmethod
    def to_report(
        cls,
        *,
        report_id: Any,
        clinical_status: str,
        patient: Any,
        test_name: str,
        report_number: Any = None,
        category: Any = None,
        lab_name: Any = None,
        branch_name: Any = None,
        doctor_name: Any = None,
        consultation_id: Any = None,
        consultation_label: str | None = None,
        encounter_id: Any = None,
        collection_date: Any = None,
        report_date: Any = None,
        uploaded_at: Any = None,
        clinical_findings_preview: str | None = None,
        last_visit_at: Any = None,
        structured_result: Any = None,
    ) -> WorkspaceReportDTO:
        patient_dto = cls.to_patient_context(
            patient,
            last_visit_at=last_visit_at,
            current_consultation_id=consultation_id,
            current_consultation_label=consultation_label,
        )
        preview = clinical_findings_preview
        if preview is None:
            preview = _findings_preview(structured_result)
        return WorkspaceReportDTO(
            id=str(report_id),
            report_number=str(report_number) if report_number else None,
            patient=patient_dto,
            test_name=test_name or "Diagnostic report",
            category=str(category) if category else None,
            lab_name=str(lab_name) if lab_name else None,
            branch_name=str(branch_name) if branch_name else None,
            doctor_name=str(doctor_name) if doctor_name else None,
            consultation_id=_str_id(consultation_id),
            consultation_label=consultation_label,
            encounter_id=_str_id(encounter_id),
            collection_date=_iso(collection_date),
            report_date=_iso(report_date),
            uploaded_at=_iso(uploaded_at),
            clinical_status=clinical_status,
            clinical_findings_preview=preview,
        )

    @classmethod
    def to_report_from_report_object(
        cls,
        report: Any,
        *,
        clinical_status: str,
        preview_url_by_artifact_id: dict[str, str] | None = None,
        download_url_by_artifact_id: dict[str, str] | None = None,
    ) -> WorkspaceReportDTO:
        """Convenience for a DiagnosticTestReport-like object with prefetched relations."""
        line = getattr(report, "order_test_line", None)
        order = getattr(line, "order", None) if line is not None else None
        patient = getattr(order, "patient_profile", None) if order is not None else None
        service = getattr(line, "service", None) if line is not None else None
        branch = getattr(order, "branch", None) if order is not None else None
        doctor = getattr(order, "doctor", None) if order is not None else None
        consultation = getattr(order, "consultation", None) if order is not None else None
        encounter = getattr(order, "encounter", None) if order is not None else None

        consultation_id = getattr(order, "consultation_id", None) if order is not None else None
        consultation_label = None
        if consultation_id:
            consultation_label = f"Consultation {consultation_id}"

        doctor_name = None
        if doctor is not None:
            doctor_name = getattr(doctor, "name", None) or getattr(doctor, "full_name", None)

        return cls.to_report(
            report_id=getattr(report, "id"),
            clinical_status=clinical_status,
            patient=patient,
            test_name=getattr(service, "name", None) or "Diagnostic report",
            report_number=getattr(report, "report_number", None),
            category=_service_category_label(service),
            lab_name=getattr(branch, "branch_name", None) or getattr(branch, "name", None),
            branch_name=getattr(branch, "branch_name", None) or getattr(branch, "name", None),
            doctor_name=doctor_name,
            consultation_id=consultation_id,
            consultation_label=consultation_label,
            encounter_id=getattr(encounter, "id", None) if encounter is not None else None,
            collection_date=getattr(order, "collected_at", None) if order is not None else None,
            report_date=getattr(report, "ready_at", None) or getattr(report, "uploaded_at", None),
            uploaded_at=getattr(report, "uploaded_at", None),
            last_visit_at=getattr(order, "created_at", None) if order is not None else None,
            structured_result=getattr(report, "structured_result", None),
        )

    @classmethod
    def to_report_detail_from_aggregate(
        cls,
        aggregate: Any,
        *,
        clinical_status: str,
        artifact_presentations: Sequence[Any] = (),
        preview_url_by_artifact_id: dict[str, str] | None = None,
        download_url_by_artifact_id: dict[str, str] | None = None,
    ) -> WorkspaceReportDetailDTO:
        """Map ReportDetailAggregate + ArtifactPresentations → detail DTO."""
        report = aggregate.report
        patient = aggregate.patient
        service = aggregate.service
        branch = aggregate.branch
        doctor = aggregate.doctor
        consultation = aggregate.consultation
        encounter = aggregate.encounter

        consultation_id = getattr(consultation, "id", None) if consultation is not None else None
        consultation_label = (
            f"Consultation {consultation_id}" if consultation_id else None
        )

        doctor_name = None
        if doctor is not None:
            doctor_name = getattr(doctor, "name", None) or getattr(doctor, "full_name", None)

        lab_label = None
        if branch is not None:
            lab_label = getattr(branch, "branch_name", None) or getattr(branch, "name", None)

        summary = cls.to_report(
            report_id=getattr(report, "id"),
            clinical_status=clinical_status,
            patient=patient,
            test_name=getattr(service, "name", None) or "Diagnostic report",
            report_number=getattr(report, "report_number", None),
            category=_service_category_label(service),
            lab_name=lab_label,
            branch_name=lab_label,
            doctor_name=doctor_name,
            consultation_id=consultation_id,
            consultation_label=consultation_label,
            encounter_id=getattr(encounter, "id", None) if encounter is not None else None,
            collection_date=aggregate.collected_at,
            report_date=getattr(report, "ready_at", None) or aggregate.uploaded_at,
            uploaded_at=aggregate.uploaded_at,
            last_visit_at=aggregate.ordered_at,
            structured_result=getattr(report, "structured_result", None),
        )

        preview_map = preview_url_by_artifact_id or {}
        download_map = download_url_by_artifact_id or {}
        # Tuple order is presentation order; mapper does not sort.
        artifact_dtos = tuple(
            cls.to_artifact_from_presentation(
                presentation,
                preview_url=preview_map.get(str(getattr(presentation, "artifact_id"))),
                download_url=download_map.get(str(getattr(presentation, "artifact_id"))),
            )
            for presentation in (artifact_presentations or ())
        )
        timeline = cls.to_timeline(
            ordered_at=aggregate.ordered_at,
            collected_at=aggregate.collected_at,
            uploaded_at=aggregate.uploaded_at,
        )
        return WorkspaceReportDetailDTO(
            id=summary.id,
            report_number=summary.report_number,
            patient=summary.patient,
            test_name=summary.test_name,
            category=summary.category,
            lab_name=summary.lab_name,
            branch_name=summary.branch_name,
            doctor_name=summary.doctor_name,
            consultation_id=summary.consultation_id,
            consultation_label=summary.consultation_label,
            encounter_id=summary.encounter_id,
            collection_date=summary.collection_date,
            report_date=summary.report_date,
            uploaded_at=summary.uploaded_at,
            clinical_status=summary.clinical_status,
            clinical_findings_preview=summary.clinical_findings_preview,
            artifacts=artifact_dtos,
            timeline=timeline,
            clinical_findings=_findings_full(getattr(report, "structured_result", None)),
        )

    @classmethod
    def to_report_detail(
        cls,
        report: Any,
        *,
        clinical_status: str,
        artifact_presentations: Sequence[Any] = (),
        preview_url_by_artifact_id: dict[str, str] | None = None,
        download_url_by_artifact_id: dict[str, str] | None = None,
    ) -> WorkspaceReportDetailDTO:
        """Map report object + ArtifactPresentations → detail DTO (tests / stubs)."""
        summary = cls.to_report_from_report_object(report, clinical_status=clinical_status)
        preview_map = preview_url_by_artifact_id or {}
        download_map = download_url_by_artifact_id or {}
        artifact_dtos = tuple(
            cls.to_artifact_from_presentation(
                presentation,
                preview_url=preview_map.get(str(getattr(presentation, "artifact_id"))),
                download_url=download_map.get(str(getattr(presentation, "artifact_id"))),
            )
            for presentation in (artifact_presentations or ())
        )
        line = getattr(report, "order_test_line", None)
        order = getattr(line, "order", None) if line is not None else None
        timeline = cls.to_timeline(
            ordered_at=getattr(order, "created_at", None) if order is not None else None,
            collected_at=getattr(order, "collected_at", None) if order is not None else None,
            uploaded_at=getattr(report, "uploaded_at", None),
        )
        return WorkspaceReportDetailDTO(
            id=summary.id,
            report_number=summary.report_number,
            patient=summary.patient,
            test_name=summary.test_name,
            category=summary.category,
            lab_name=summary.lab_name,
            branch_name=summary.branch_name,
            doctor_name=summary.doctor_name,
            consultation_id=summary.consultation_id,
            consultation_label=summary.consultation_label,
            encounter_id=summary.encounter_id,
            collection_date=summary.collection_date,
            report_date=summary.report_date,
            uploaded_at=summary.uploaded_at,
            clinical_status=summary.clinical_status,
            clinical_findings_preview=summary.clinical_findings_preview,
            artifacts=artifact_dtos,
            timeline=timeline,
            clinical_findings=_findings_full(getattr(report, "structured_result", None)),
        )

    @staticmethod
    def to_summary(
        *,
        reports_ready: int,
        awaiting: int,
        critical: int = 0,
        as_response: bool = False,
    ) -> WorkspaceSummaryDTO | WorkspaceSummaryResponseDTO:
        summary = WorkspaceSummaryDTO(
            reports_ready=int(reports_ready),
            awaiting=int(awaiting),
            critical=int(critical),
        )
        if as_response:
            return WorkspaceSummaryResponseDTO(summary=summary)
        return summary

    @staticmethod
    def to_filters(
        *,
        statuses: Iterable[str],
        labs: Iterable[str],
        categories: Iterable[str],
        doctors: Iterable[str],
        branches: Iterable[str],
        as_response: bool = False,
    ) -> WorkspaceFiltersDTO | WorkspaceFiltersResponseDTO:
        filters = WorkspaceFiltersDTO(
            statuses=tuple(statuses),
            labs=tuple(labs),
            categories=tuple(categories),
            doctors=tuple(doctors),
            branches=tuple(branches),
        )
        if as_response:
            return WorkspaceFiltersResponseDTO(filters=filters)
        return filters

    @staticmethod
    def to_list_response(
        reports: Sequence[WorkspaceReportDTO],
        *,
        page: int,
        page_size: int,
        next_cursor: str | None = None,
    ) -> WorkspaceListResponseDTO:
        return WorkspaceListResponseDTO(
            reports=tuple(reports),
            pagination=WorkspacePaginationDTO(
                page=int(page),
                page_size=int(page_size),
                next_cursor=next_cursor,
            ),
        )
