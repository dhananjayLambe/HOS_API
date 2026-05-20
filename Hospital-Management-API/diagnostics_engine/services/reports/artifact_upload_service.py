"""
Production upload engine for diagnostic report artifacts.

Artifact ``version`` is the file-level revision within a report workflow,
NOT ``DiagnosticTestReport.revision_number`` (report-level correction chain).
"""

from __future__ import annotations

import logging
import mimetypes
import time

from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from diagnostics_engine.monitoring.report_events import (
    OUTCOME_FAILED,
    OUTCOME_STARTED,
    OUTCOME_SUCCESS,
    emit_report_event,
    safe_emit,
)
from diagnostics_engine.services.reports.access_control import get_report_branch_id

from diagnostics_engine.domain.reports import get_active_report_for_line, get_primary_artifact
from diagnostics_engine.domain.reports import upload_rules
from diagnostics_engine.services.reports.report_audit import emit_report_audit_event
from diagnostics_engine.services.reports.report_validation_service import ReportValidationService
from diagnostics_engine.services.reports.report_workflow_service import ReportWorkflowService
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from diagnostics_engine.models.reports import (
    DiagnosticReportArtifact,
    DiagnosticTestReport,
    ReportArtifactType,
    build_report_download_filename,
)

logger = logging.getLogger("diagnostics.reports")

# Re-export domain upload rules for backward compatibility.
DEFAULT_MAX_REPORT_UPLOAD_SIZE_MB = upload_rules.DEFAULT_MAX_REPORT_UPLOAD_SIZE_MB
DEFAULT_MAX_REPORT_BATCH_UPLOAD_SIZE_MB = upload_rules.DEFAULT_MAX_REPORT_BATCH_UPLOAD_SIZE_MB
DEFAULT_MAX_REPORT_UPLOAD_FILES = upload_rules.DEFAULT_MAX_REPORT_UPLOAD_FILES
ALLOWED_EXTENSIONS = upload_rules.ALLOWED_EXTENSIONS
BLOCKED_EXTENSIONS = upload_rules.BLOCKED_EXTENSIONS
EXTENSION_TO_ARTIFACT_TYPE = upload_rules.EXTENSION_TO_ARTIFACT_TYPE
EXPECTED_MIME_BY_EXT = upload_rules.EXPECTED_MIME_BY_EXT
GENERIC_MIME_HINTS = upload_rules.GENERIC_MIME_HINTS


class ArtifactUploadService:
    """Report bootstrap, multi-file uploads, validation, and primary artifact management."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    @transaction.atomic
    def create_or_get_report_for_line(
        cls,
        *,
        order_test_line: DiagnosticOrderTestLine,
        uploaded_by=None,
    ) -> DiagnosticTestReport:
        """Return the active workflow report for a line, creating one if needed."""
        existing = get_active_report_for_line(order_test_line)
        if existing is not None:
            logger.info(
                "artifact_upload_active_report_found report_id=%s line_id=%s",
                existing.pk,
                order_test_line.pk,
            )
            return existing

        report = DiagnosticTestReport.objects.create(
            order_test_line=order_test_line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
            uploaded_by=uploaded_by,
        )
        logger.info(
            "artifact_upload_report_created report_id=%s line_id=%s",
            report.pk,
            order_test_line.pk,
        )
        return report

    ensure_report_for_line = create_or_get_report_for_line

    @classmethod
    def upload_report_artifacts(
        cls,
        *,
        report: DiagnosticTestReport,
        uploaded_files: list,
        uploaded_by=None,
        primary_file_index: int | None = None,
        version: int | None = None,
    ) -> list[DiagnosticReportArtifact]:
        """
        Validate all files, persist all artifacts, assign primary, transition lifecycle once.

        ``version`` is artifact-level file revision within this report row, not report.revision_number.
        """
        saved_paths: list[str] = []
        started = time.monotonic()
        user_id = getattr(uploaded_by, "pk", None)
        safe_emit(
            emit_report_event,
            "report_upload_started",
            outcome=OUTCOME_STARTED,
            report_id=report.pk,
            branch_id=get_report_branch_id(report),
            user_id=user_id,
        )
        try:
            created = cls._upload_report_artifacts_atomic(
                report=report,
                uploaded_files=uploaded_files,
                uploaded_by=uploaded_by,
                primary_file_index=primary_file_index,
                version=version,
                saved_paths=saved_paths,
            )
        except Exception:
            cls._cleanup_saved_storage_paths(saved_paths)
            duration_ms = int((time.monotonic() - started) * 1000)
            safe_emit(
                emit_report_event,
                "report_upload_failed",
                outcome=OUTCOME_FAILED,
                report_id=report.pk,
                branch_id=get_report_branch_id(report),
                user_id=user_id,
                duration_ms=duration_ms,
            )
            raise

        duration_ms = int((time.monotonic() - started) * 1000)
        safe_emit(
            emit_report_event,
            "report_upload_completed",
            outcome=OUTCOME_SUCCESS,
            report_id=report.pk,
            artifact_ids=[a.pk for a in created],
            branch_id=get_report_branch_id(report),
            user_id=user_id,
            duration_ms=duration_ms,
        )
        safe_emit(
            emit_report_audit_event,
            action="artifact_uploaded",
            report=report,
            user=uploaded_by,
            metadata={"count": len(created), "artifact_ids": [str(a.pk) for a in created]},
        )
        return created

    @classmethod
    @transaction.atomic
    def _upload_report_artifacts_atomic(
        cls,
        *,
        report: DiagnosticTestReport,
        uploaded_files: list,
        uploaded_by=None,
        primary_file_index: int | None = None,
        version: int | None = None,
        saved_paths: list[str],
    ) -> list[DiagnosticReportArtifact]:
        ReportValidationService.validate_report_ready_for_upload(report)
        files = list(uploaded_files or [])
        if not files:
            raise ValidationError("At least one file is required.")

        ReportValidationService.validate_artifact_upload_batch(files)
        if primary_file_index is not None:
            upload_rules.validate_primary_file_index(primary_file_index, len(files))

        prepared: list[dict] = []
        batch_checksums: set[str] = set()
        for index, uploaded in enumerate(files):
            meta = cls._validate_and_prepare_file(
                uploaded,
                report=report,
                file_index=index,
                batch_checksums=batch_checksums,
            )
            prepared.append(meta)

        if version is None:
            base_version = cls._next_artifact_version(report)
        else:
            base_version = version

        created: list[DiagnosticReportArtifact] = []
        for index, meta in enumerate(prepared):
            file_version = base_version if version is not None else base_version + index
            artifact = cls._create_artifact(
                report=report,
                file=meta["file"],
                uploaded_by=uploaded_by,
                artifact_type=meta["artifact_type"],
                is_primary=False,
                version=file_version,
                original_filename=meta["original_filename"],
                file_extension=meta["file_extension"],
                content_type=meta["content_type"],
                file_size=meta["file_size"],
                checksum=meta["checksum"],
                download_filename=meta["download_filename"],
            )
            if artifact.file and artifact.file.name:
                saved_paths.append(artifact.file.name)
            created.append(artifact)

        cls._assign_primary_artifact(
            report,
            created,
            primary_file_index=primary_file_index,
        )
        cls._transition_report_on_upload(report, uploaded_by=uploaded_by)

        logger.info(
            "artifact_upload_batch_complete report_id=%s count=%s",
            report.pk,
            len(created),
        )
        return created

    @classmethod
    def _cleanup_saved_storage_paths(cls, paths: list[str]) -> None:
        for path in paths:
            if not path:
                continue
            try:
                if default_storage.exists(path):
                    default_storage.delete(path)
            except Exception:
                logger.warning("storage_cleanup_failed path=%s", path, exc_info=True)

    @classmethod
    def upload_artifact(
        cls,
        *,
        report: DiagnosticTestReport,
        file,
        uploaded_by=None,
        artifact_type: str | None = None,
        is_primary: bool = False,
        version: int | None = None,
        replace_primary: bool = False,
    ) -> DiagnosticReportArtifact:
        """
        Backward-compatible single-file upload wrapper.

        ``is_primary``: mark this file as the primary artifact for the batch.
        ``replace_primary``: same index behavior as ``is_primary`` for a single file;
        use :meth:`replace_primary_artifact` when swapping primary on an existing report.
        """
        del artifact_type  # inferred from file in batch path
        primary_index = 0 if (is_primary or replace_primary) else None
        artifacts = cls.upload_report_artifacts(
            report=report,
            uploaded_files=[file],
            uploaded_by=uploaded_by,
            primary_file_index=primary_index,
            version=version,
        )
        return artifacts[0]

    @classmethod
    @transaction.atomic
    def replace_primary_artifact(
        cls,
        *,
        report: DiagnosticTestReport,
        artifact: DiagnosticReportArtifact,
    ) -> None:
        """Demote the current primary and promote ``artifact`` (must be active)."""
        ReportValidationService.validate_report_ready_for_upload(report)
        ReportValidationService.validate_artifact_belongs_to_report(artifact, report)
        if not artifact.is_active:
            raise ValidationError("Cannot promote an inactive artifact as primary.")

        DiagnosticTestReport.objects.select_for_update().filter(pk=report.pk).first()
        cls._demote_existing_primary(report)
        artifact.is_primary = True
        artifact.full_clean()
        artifact.save(update_fields=["is_primary"])
        logger.info(
            "artifact_upload_primary_replaced report_id=%s artifact_id=%s",
            report.pk,
            artifact.pk,
        )

    @classmethod
    @transaction.atomic
    def mark_report_uploaded(
        cls,
        *,
        report: DiagnosticTestReport,
        uploaded_by=None,
    ) -> DiagnosticTestReport:
        """
        Confirm upload step after preview (metadata only).

        Prefer :meth:`confirm_report_upload`. Does not mark the report READY.
        """
        return cls.confirm_report_upload(report=report, uploaded_by=uploaded_by)

    @classmethod
    @transaction.atomic
    def confirm_report_upload(
        cls,
        *,
        report: DiagnosticTestReport,
        uploaded_by=None,
    ) -> DiagnosticTestReport:
        """Explicit confirm-upload step: ensure IN_PROGRESS and audit metadata."""
        ReportValidationService.validate_report_ready_for_upload(report)
        changed = False
        update_fields: list[str] = []
        if report.status == ReportLifecycleStatus.PENDING:
            report.status = ReportLifecycleStatus.IN_PROGRESS
            update_fields.append("status")
            changed = True
        if uploaded_by is not None and report.uploaded_by is None:
            report.uploaded_by = uploaded_by
            update_fields.append("uploaded_by")
            changed = True
        if changed:
            report.updated_at = timezone.now()
            update_fields.append("updated_at")
            report.save(update_fields=update_fields)
        logger.info("artifact_upload_confirmed report_id=%s", report.pk)
        return report

    @classmethod
    @transaction.atomic
    def replace_artifact(
        cls,
        *,
        report: DiagnosticTestReport,
        old_artifact: DiagnosticReportArtifact,
        file,
        uploaded_by=None,
    ) -> DiagnosticReportArtifact:
        """
        Deactivate ``old_artifact``, upload replacement file, promote new primary.

        Same-checksum re-upload is allowed (explicit replacement flow).
        """
        ReportValidationService.validate_report_ready_for_upload(report)
        ReportValidationService.validate_artifact_belongs_to_report(old_artifact, report)
        if not old_artifact.is_active:
            raise ValidationError("Cannot replace an inactive artifact.")

        DiagnosticTestReport.objects.select_for_update().filter(pk=report.pk).first()

        old_artifact.is_active = False
        old_artifact.is_primary = False
        old_artifact.save(update_fields=["is_active", "is_primary"])

        meta = cls._validate_and_prepare_file(
            file,
            report=report,
            file_index=0,
            batch_checksums=None,
            skip_duplicate_check=True,
        )
        new_artifact = cls._create_artifact(
            report=report,
            file=meta["file"],
            uploaded_by=uploaded_by,
            artifact_type=meta["artifact_type"],
            is_primary=True,
            version=cls._next_artifact_version(report),
            original_filename=meta["original_filename"],
            file_extension=meta["file_extension"],
            content_type=meta["content_type"],
            file_size=meta["file_size"],
            checksum=meta["checksum"],
            download_filename=meta["download_filename"],
        )
        cls._transition_report_on_upload(report, uploaded_by=uploaded_by)
        emit_report_audit_event(
            action="artifact_replaced",
            report=report,
            user=uploaded_by,
            metadata={
                "old_artifact_id": str(old_artifact.pk),
                "new_artifact_id": str(new_artifact.pk),
            },
        )
        logger.info(
            "artifact_upload_replaced report_id=%s old_id=%s new_id=%s",
            report.pk,
            old_artifact.pk,
            new_artifact.pk,
        )
        return new_artifact

    @classmethod
    def prepare_correction_upload(
        cls,
        *,
        order_test_line: DiagnosticOrderTestLine,
        uploaded_by=None,
        **kwargs,
    ) -> DiagnosticTestReport:
        """Create a new correction head report via the supersede chain."""
        old_report = get_active_report_for_line(order_test_line)
        if old_report is None:
            raise ValidationError("No active report exists for this test line.")
        return ReportWorkflowService.create_superseding_report(
            old_report=old_report,
            uploaded_by=uploaded_by,
        )

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    @classmethod
    def _next_artifact_version(cls, report: DiagnosticTestReport) -> int:
        # NOTE: Operational lineage only. Concurrent uploads may assign the same version number.
        # Future DB-backed sequencing may replace this approach.
        agg = report.artifacts.aggregate(max_v=Max("version"))
        current = agg["max_v"] or 0
        return int(current) + 1

    @classmethod
    def _validate_and_prepare_file(
        cls,
        file,
        *,
        report: DiagnosticTestReport,
        file_index: int,
        batch_checksums: set[str] | None = None,
        skip_duplicate_check: bool = False,
    ) -> dict:
        upload_rules.validate_uploaded_file(file, file_index=file_index)
        original_filename = upload_rules.original_filename(file)
        extension = upload_rules.normalized_extension(original_filename)
        content_type = cls._content_type_hint(file, extension)
        file_size = upload_rules.file_size(file)
        checksum = upload_rules.compute_file_checksum(file)
        if batch_checksums is not None:
            if checksum in batch_checksums:
                raise ValidationError("This file was already uploaded.")
            batch_checksums.add(checksum)
        if not skip_duplicate_check:
            cls._validate_duplicate_upload(report=report, checksum=checksum)
        artifact_type = upload_rules.infer_artifact_type(original_filename, content_type, extension)
        download_filename = build_report_download_filename(
            report,
            extension=extension or "pdf",
        )
        return {
            "file": file,
            "original_filename": original_filename,
            "file_extension": extension,
            "content_type": content_type,
            "file_size": file_size,
            "checksum": checksum,
            "artifact_type": artifact_type,
            "download_filename": download_filename,
        }

    @classmethod
    def _validate_duplicate_upload(cls, *, report: DiagnosticTestReport, checksum: str) -> None:
        if DiagnosticReportArtifact.objects.filter(
            report=report,
            checksum=checksum,
            is_active=True,
        ).exists():
            logger.warning(
                "artifact_upload_duplicate_checksum report_id=%s checksum=%s",
                report.pk,
                checksum[:12],
            )
            raise ValidationError("This file was already uploaded.")

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    @classmethod
    def _create_artifact(
        cls,
        *,
        report: DiagnosticTestReport,
        file,
        uploaded_by,
        artifact_type: str,
        is_primary: bool,
        version: int,
        original_filename: str,
        file_extension: str,
        content_type: str | None,
        file_size: int,
        checksum: str,
        download_filename: str,
    ) -> DiagnosticReportArtifact:
        artifact = DiagnosticReportArtifact(
            report=report,
            file=file,
            artifact_type=artifact_type,
            is_primary=is_primary,
            version=version,
            uploaded_by=uploaded_by,
            original_filename=original_filename,
            file_extension=file_extension,
            content_type=content_type or "",
            file_size=file_size,
            checksum=checksum,
            download_filename=download_filename,
            is_active=True,
        )
        artifact.full_clean()
        artifact.save()
        if artifact.file and not artifact.storage_path:
            artifact.storage_path = artifact.file.name
            artifact.save(update_fields=["storage_path"])
        logger.info(
            "artifact_upload_created artifact_id=%s report_id=%s primary=%s",
            artifact.pk,
            report.pk,
            is_primary,
        )
        return artifact

    @classmethod
    def _assign_primary_artifact(
        cls,
        report: DiagnosticTestReport,
        created: list[DiagnosticReportArtifact],
        *,
        primary_file_index: int | None,
    ) -> None:
        if not created:
            return

        if get_primary_artifact(report) is not None and primary_file_index is None:
            return

        if primary_file_index is not None:
            cls.replace_primary_artifact(report=report, artifact=created[primary_file_index])
            return

        if get_primary_artifact(report) is None:
            cls.replace_primary_artifact(report=report, artifact=created[0])

    @classmethod
    def _transition_report_on_upload(
        cls,
        report: DiagnosticTestReport,
        *,
        uploaded_by=None,
    ) -> None:
        changed = False
        update_fields: list[str] = []
        if report.storage_mode == ReportStorageMode.STRUCTURED:
            report.storage_mode = ReportStorageMode.FILE
            update_fields.append("storage_mode")
            changed = True
        if report.status == ReportLifecycleStatus.PENDING:
            report.status = ReportLifecycleStatus.IN_PROGRESS
            update_fields.append("status")
            changed = True
        if uploaded_by is not None and report.uploaded_by is None:
            report.uploaded_by = uploaded_by
            update_fields.append("uploaded_by")
            changed = True
        if changed:
            report.updated_at = timezone.now()
            update_fields.append("updated_at")
            report.save(update_fields=update_fields)

    @classmethod
    def _demote_existing_primary(cls, report: DiagnosticTestReport) -> None:
        DiagnosticReportArtifact.objects.filter(
            report=report,
            is_primary=True,
            is_active=True,
        ).update(is_primary=False)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @classmethod
    def _content_type_hint(cls, file, extension: str) -> str | None:
        raw = (getattr(file, "content_type", None) or "").strip()
        if raw:
            return raw
        guessed, _ = mimetypes.guess_type(f"file.{extension}")
        return guessed

    _generate_checksum = staticmethod(upload_rules.compute_file_checksum)

