import uuid
from pathlib import Path

from django.contrib.postgres.indexes import OpClass
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models.functions import Upper
from django.utils import timezone
from django.utils.text import slugify

from labs.choices.tracking import DeliveryStatus

from .choices import OrderStatus, ReportLifecycleStatus, ReportStorageMode
from .orders import DiagnosticOrder, DiagnosticOrderTestLine


# --------------------------------------------------------------------
# REPORT FILE STORAGE HELPERS
# --------------------------------------------------------------------
from diagnostics_engine.storage.report_upload_paths import build_report_artifact_upload_path


def build_report_download_filename(report, extension="pdf"):
    """
    Builds a human-readable report download filename.

    Storage filenames remain infrastructure-safe.

    Human-readable download examples:

    Rahul_K_CBC_Report_19_May_2026.pdf
    Priya_Sharma_MRI_Brain_Report_19_May_2026.pdf
    Amit_Kumar_Thyroid_Profile_Report_19_May_2026.pdf

    Download filenames are used for:
    - WhatsApp delivery
    - patient downloads
    - doctor downloads
    - browser download UX

    Storage filenames remain opaque/internal.
    """

    patient_name = "Patient"
    test_name = "Diagnostic_Report"

    try:
        profile = report.order_test_line.order.patient_profile
        if profile:
            patient_name = slugify(profile.get_full_name()).replace("-", "_")
    except AttributeError:
        pass

    try:
        service = report.order_test_line.service
        if service and service.name:
            test_name = slugify(service.name).replace("-", "_")
    except AttributeError:
        pass

    report_date = (
        report.delivered_at or report.ready_at or timezone.now()
    ).strftime("%d_%b_%Y")

    return (
        f"{patient_name}_{test_name}_Report_{report_date}.{extension}"
    )


class ReportArtifactType(models.TextChoices):
    """
    Supported diagnostic report attachment formats.

    Files are treated as report artifacts,
    not workflow entities.
    """

    PDF = "PDF", "PDF"
    IMAGE = "IMAGE", "Image"
    CSV = "CSV", "CSV"
    XLSX = "XLSX", "Excel"
    DOCX = "DOCX", "Word"
    TXT = "TXT", "Text"
    ZIP = "ZIP", "ZIP"
    DICOM = "DICOM", "DICOM"


class ArtifactLifecycleState(models.TextChoices):
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"
    DELETED = "deleted", "Deleted"
    QUARANTINE = "quarantine", "Quarantine"


class ArtifactSourceType(models.TextChoices):
    LAB_UPLOAD = "lab_upload", "Lab Upload"
    DOCTOR_UPLOAD = "doctor_upload", "Doctor Upload"
    PATIENT_UPLOAD = "patient_upload", "Patient Upload"
    SYSTEM_GENERATED = "system_generated", "System Generated"
    AI_GENERATED = "ai_generated", "AI Generated"


class ArtifactCategory(models.TextChoices):
    DIAGNOSTIC_REPORT = "diagnostic_report", "Diagnostic Report"
    IMAGING = "imaging", "Imaging"
    PRESCRIPTION = "prescription", "Prescription"
    INVOICE = "invoice", "Invoice"
    CONSENT_FORM = "consent_form", "Consent Form"
    OTHER = "other", "Other"

# =========================================================
# DIAGNOSTIC REPORT DOMAIN
# =========================================================
# This module handles diagnostic result persistence.
#
# Two reporting architectures exist:
#
# 1. DiagnosticReport
#    Legacy / order-level reporting.
#    One report per order.
#
# 2. DiagnosticTestReport
#    Modern execution-level reporting.
#    One report per execution test line.
#
# Why execution-level reporting matters:
# - package expansion support
# - partial report delivery
# - independent workflow tracking
# - lab technician workflows
# - enterprise scalability
#
# Architecture layering:
# DiagnosticOrder
#    -> DiagnosticOrderTestLine
#           -> DiagnosticTestReport
#

# Future direction:
# DiagnosticTestReport becomes the primary reporting model.
# =========================================================
# =========================================================
# REPORTING ARCHITECTURE SUMMARY
# =========================================================
# Production reporting architecture is task-centric.
#
# Workflow lifecycle belongs to:
#     DiagnosticTestReport
#
# Uploaded files/artifacts belong to:
#     DiagnosticReportArtifact
#
# This separation is important because:
# - one test line may generate many files
# - reports may be corrected/re-uploaded
# - machine exports may accompany PDFs
# - radiology workflows may include DICOM/images
# - WhatsApp delivery should target a primary artifact
#
# ---------------------------------------------------------
# CURRENT PHASE-1 ARCHITECTURE
# ---------------------------------------------------------
# DiagnosticOrder
#     -> DiagnosticOrderTestLine
#            -> DiagnosticTestReport
#                   -> DiagnosticReportArtifact[]
#
# Example:
#
# MRI Brain Test Line
#     -> DiagnosticTestReport
#           status = READY
#
#           artifacts:
#               - signed-report.pdf (PRIMARY)
#               - dicom.zip
#               - preview-image.jpg
#
# ---------------------------------------------------------
# FRONTEND ALIGNMENT
# ---------------------------------------------------------
# Frontend workflow is task-first.
#
# Patient
#     -> many report tasks
#           -> many uploaded artifacts/files
#
# Upload flow:
#     Select Task
#         -> Upload Files
#         -> Preview
#         -> Confirm
#         -> Deliver
#
# NOT:
#     upload random files first.
#
# ---------------------------------------------------------
# FUTURE EXPANSION READY
# ---------------------------------------------------------
# This architecture supports:
# - per-test-line reporting
# - corrected reports
# - report revisions
# - multi-file uploads
# - radiology attachments
# - WhatsApp delivery
# - audit-safe workflows
# - future AI-generated reports
# - DICOM integrations
# =========================================================
#
# File naming strategy:
# - storage filename -> infrastructure safe
# - download filename -> human readable
# - original filename -> preserved for audit/debugging
#
# Example:
#
# original filename:
#     CBC final signed.pdf
#
# stored filename:
#     artifact_7f21ab3c_v2.pdf
#
# download filename:
#     Rahul_K_CBC_Report_19_May_2026.pdf
#
# storage path (S3/local key only — never patient name; see report_upload_paths.py):
# diagnostic-reports/active/<account_id>/<profile_id>/2026/05/<encounter_id>/<report_id>/pdf/artifact_<id>_v2.pdf


class DiagnosticReport(models.Model):
    """
    Legacy order-level reporting model.

    Older/simple workflows may generate a single report
    for the entire diagnostic order.

    Example:
    CBC + Sugar + Lipid Profile
        -> one combined PDF/report

    Modern enterprise workflows should prefer
    DiagnosticTestReport for execution-level tracking.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.OneToOneField(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="report",
        null=True,
        blank=True,
    )

    # Defines how report data is persisted.
    #
    # STRUCTURED:
    #     normalized JSON-style report data.
    #
    # FILE:
    #     uploaded PDF/image report.
    #
    # HYBRID:
    #     structured + uploaded artifacts.
    storage_mode = models.CharField(
        max_length=20,
        choices=ReportStorageMode.choices,
        default=ReportStorageMode.STRUCTURED,
    )

    # Structured machine-readable diagnostic result.
    # Future AI analytics and longitudinal tracking
    # will primarily use this layer.
    structured_result = models.JSONField(blank=True, null=True)
    file = models.FileField(upload_to="diagnostic_reports/", null=True, blank=True)

    # Report processing lifecycle.
    #
    # Independent from order lifecycle.
    # Example:
    # PENDING -> IN_PROGRESS -> READY -> DELIVERED
    status = models.CharField(
        max_length=20,
        choices=ReportLifecycleStatus.choices,
        default=ReportLifecycleStatus.PENDING,
    )
    uploaded_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_reports_uploaded",
    )

    # Locked after delivery to preserve
    # medical/legal audit integrity.
    is_editable = models.BooleanField(default=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivered_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_reports_delivered",
    )
    delivered_reason = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_reports_deleted",
    )

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
        ]

    # Handles:
    # - edit locking
    # - legacy order status synchronization
    # - audit logging
    # - report delivery timestamping
    def save(self, *args, **kwargs):
        with transaction.atomic():
            old_status = None
            if not self._state.adding:
                old = type(self).objects.only("is_editable", "status").get(pk=self.pk)
                if not old.is_editable:
                    raise ValidationError("Report locked.")
                old_status = old.status

            super().save(*args, **kwargs)

            # Legacy compatibility path.
            #
            # If execution-level test lines do not exist,
            # synchronize order state using the legacy
            # single-report workflow.
            if self.order_id and not self.order.test_lines.exists():
                from diagnostics_engine.domain.order_status import OrderStatusAggregationService

                if self.status == ReportLifecycleStatus.READY:
                    OrderStatusAggregationService.sync_from_legacy_report(
                        self.order, ReportLifecycleStatus.READY
                    )
                elif self.status == ReportLifecycleStatus.DELIVERED:
                    self.delivered_at = timezone.now()
                    self.is_editable = False
                    super().save(update_fields=["delivered_at", "is_editable", "updated_at"])
                    OrderStatusAggregationService.sync_from_legacy_report(
                        self.order, ReportLifecycleStatus.DELIVERED
                    )

            if old_status is not None and old_status != self.status:
                from consultations_core.domain.audit import AuditService

                AuditService.log_status_change(
                    instance=self,
                    field_name="status",
                    old_value=old_status,
                    new_value=self.status,
                    user=None,
                    source="system",
                    reason=None,
                )

    # Administrative override.
    #
    # Useful for:
    # - corrected reports
    # - compliance fixes
    # - upload mistakes
    def allow_admin_edit(self):
        self.is_editable = True
        self.save(update_fields=["is_editable"])

    def __str__(self):
        return f"Report - {self.order_id or 'no-order'}"


class DiagnosticTestReport(models.Model):
    """
    Execution-level diagnostic reporting model.

    Each DiagnosticOrderTestLine gets its own report.

    Example:
    Full Body Package
        -> CBC report
        -> Lipid Profile report
        -> HbA1c report

    This is the preferred scalable architecture.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Direct linkage to execution-level workflow.
    #
    # Enables:
    # - partial completion
    # - package expansion tracking
    # - technician workflows
    # - granular operational monitoring
    order_test_line = models.ForeignKey(
        DiagnosticOrderTestLine,
        on_delete=models.CASCADE,
        related_name="test_reports",
    )

    # Same storage abstraction as DiagnosticReport.
    # Designed for future structured + AI-ready reporting.
    storage_mode = models.CharField(
        max_length=20,
        choices=ReportStorageMode.choices,
        default=ReportStorageMode.STRUCTURED,
    )
    # Machine-readable diagnostic result.
    #
    # Future use cases:
    # - AI analytics
    # - trend tracking
    # - abnormality detection
    # - longitudinal patient history
    structured_result = models.JSONField(blank=True, null=True)

    # Human-readable report identifier.
    # Future-safe for external sharing,
    # audit workflows, and revisions.
    report_number = models.CharField(max_length=50, blank=True, null=True)

    # Revision/version tracking.
    # Useful for corrected or regenerated reports.
    revision_number = models.PositiveIntegerField(default=1)

    # Execution-level report lifecycle state.
    #
    # Used by:
    # - lab technicians
    # - doctor dashboards
    # - patient notifications
    # - WhatsApp delivery workflows
    status = models.CharField(
        max_length=20,
        choices=ReportLifecycleStatus.choices,
        default=ReportLifecycleStatus.PENDING,
    )

    # Channel delivery state (separate from report generation lifecycle).
    delivery_status = models.CharField(
        max_length=30,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
    )

    ready_at = models.DateTimeField(null=True, blank=True)

    # Prevents post-delivery modification.
    # Important for audit + compliance safety.
    is_editable = models.BooleanField(default=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_test_reports_uploaded",
    )
    delivered_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_test_reports_delivered",
    )

    reviewed_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_test_reports_reviewed",
    )

    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Latest operator-provided reason for in-place re-upload (REUPLOAD_REPLACE).
    last_reupload_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_test_reports_deleted",
    )

    # Report correction lineage.
    # Supports corrected/revised reports.
    supersedes = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="superseded_by_reports",
    )

    source_system = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["delivery_status"]),
            models.Index(fields=["uploaded_at"]),
            models.Index(fields=["order_test_line"]),
            # Workspace search: UPPER(report_number) prefix / exact (M11)
            models.Index(
                OpClass(Upper("report_number"), name="varchar_pattern_ops"),
                name="diag_rpt_num_up_pat_idx",
            ),
            # Active-head anti-join / supersession checks (M11)
            models.Index(fields=["supersedes", "deleted_at"], name="diag_rpt_super_del_idx"),
            # Soft-delete + chronological list support (M11)
            models.Index(fields=["deleted_at", "uploaded_at"], name="diag_rpt_del_up_idx"),
        ]

    # Handles:
    # - edit locking
    # - execution-level aggregation
    # - order lifecycle synchronization
    # - audit logging
    def save(self, *args, **kwargs):
        with transaction.atomic():
            old_status = None
            if not self._state.adding:
                old = type(self).objects.only("is_editable", "status").get(pk=self.pk)
                if not old.is_editable:
                    update_fields = kwargs.get("update_fields")
                    delivery_only = update_fields is not None and set(update_fields) <= {
                        "delivery_status",
                        "updated_at",
                        "last_reupload_reason",
                    }
                    if not delivery_only:
                        raise ValidationError("Report locked.")
                old_status = old.status

            if self.status == ReportLifecycleStatus.READY and not self.ready_at:
                self.ready_at = timezone.now()

            if self.status == ReportLifecycleStatus.DELIVERED:
                if not self.delivered_at:
                    self.delivered_at = timezone.now()
                self.is_editable = False

            super().save(*args, **kwargs)

            # Aggregate all execution-level report states
            # upward into the parent order lifecycle.
            from diagnostics_engine.domain.order_status import OrderStatusAggregationService

            OrderStatusAggregationService.sync_from_test_reports(self.order_test_line.order)

            if old_status is not None and old_status != self.status:
                from consultations_core.domain.audit import AuditService

                AuditService.log_status_change(
                    instance=self,
                    field_name="status",
                    old_value=old_status,
                    new_value=self.status,
                    user=None,
                    source="system",
                    reason=None,
                )

    def __str__(self):
        return f"TestReport - {self.order_test_line_id}"


 # =========================================================
# REPORT ARTIFACT FLOW
# =========================================================
# DiagnosticOrder
#     -> DiagnosticOrderTestLine
#            -> DiagnosticTestReport
#                   -> DiagnosticReportArtifact
#                   -> DiagnosticReportArtifact
#                   -> DiagnosticReportArtifact
#
# Example:
#
# CBC + Thyroid Test Line
#     -> TestReport (READY)
#           -> report.pdf
#           -> machine.csv
#           -> scan.jpg
#
# Workflow status belongs to TestReport.
# Files belong to ReportArtifact.
# =========================================================

class DiagnosticReportArtifact(models.Model):
    """
    File/artifact layer for diagnostic reporting.

    A single DiagnosticTestReport workflow can contain
    multiple uploaded artifacts.

    Examples:
    - signed PDF
    - machine CSV
    - radiology image
    - DICOM zip
    - corrected report attachment

    Workflow lifecycle belongs to DiagnosticTestReport.
    Files belong here.

    File naming architecture:

    original_filename:
        Original uploaded filename from user/device.

    stored_filename:
        Infrastructure-safe immutable filename.
        Example:
        artifact_7f21ab3c_v2.pdf

    download_filename:
        Human-readable filename used during:
        - WhatsApp sharing
        - patient downloads
        - doctor downloads

    storage_path:
        Full S3/object storage path.

    Important:
    - business queries should NEVER depend on S3 paths
    - reports are retrieved through DB relations
    - S3 acts only as artifact/blob storage
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    report = models.ForeignKey(
        DiagnosticTestReport,
        on_delete=models.CASCADE,
        related_name="artifacts",
    )
    # Denormalized external UUID for API/query convenience.
    # Source of relational truth remains ``report`` FK.
    report_public_id = models.UUIDField(null=True, blank=True, db_index=True)
    # Immutable external identity for artifact references.
    artifact_public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    patient_account_uuid = models.UUIDField(null=True, blank=True, db_index=True)
    patient_profile_uuid = models.UUIDField(null=True, blank=True, db_index=True)
    encounter_uuid = models.UUIDField(null=True, blank=True, db_index=True)

    # Infrastructure-safe immutable filename.
    # Example:
    # artifact_7f21ab3c_v2.pdf
    stored_filename = models.CharField(max_length=255, blank=True, null=True)

    # Original filename uploaded by operator/device.
    original_filename = models.CharField(max_length=255, blank=True, null=True)

    # Human-readable filename used for:
    # - WhatsApp downloads
    # - patient downloads
    # - doctor downloads
    download_filename = models.CharField(max_length=255, blank=True, null=True)

    file_extension = models.CharField(max_length=20, blank=True, null=True)

    file = models.FileField(upload_to=build_report_artifact_upload_path, max_length=512)

    artifact_type = models.CharField(
        max_length=20,
        choices=ReportArtifactType.choices,
        default=ReportArtifactType.PDF,
    )

    # Primary downloadable/shareable report.
    is_primary = models.BooleanField(default=False)

    uploaded_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_report_artifacts_uploaded",
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    file_size = models.BigIntegerField(null=True, blank=True)

    content_type = models.CharField(max_length=255, blank=True, null=True)

    checksum = models.CharField(max_length=255, blank=True, null=True)
    checksum_sha256 = models.CharField(max_length=128, blank=True, null=True, db_index=True)

    # Full object storage relative key (see diagnostics_engine.storage.report_upload_paths).
    storage_path = models.TextField(blank=True, null=True)
    # Canonical object key. Retrieval must prefer this metadata field.
    storage_key = models.TextField(blank=True, null=True)

    version = models.PositiveIntegerField(default=1)
    artifact_version = models.PositiveIntegerField(default=1)
    artifact_state = models.CharField(
        max_length=20,
        choices=ArtifactLifecycleState.choices,
        default=ArtifactLifecycleState.ACTIVE,
        db_index=True,
    )
    retention_until = models.DateTimeField(null=True, blank=True)
    legal_hold = models.BooleanField(default=False)
    source_type = models.CharField(
        max_length=30,
        choices=ArtifactSourceType.choices,
        default=ArtifactSourceType.LAB_UPLOAD,
    )
    generated_by_user_uuid = models.UUIDField(null=True, blank=True)
    source_organization_uuid = models.UUIDField(null=True, blank=True)
    uploaded_by_user_uuid = models.UUIDField(null=True, blank=True)
    artifact_category = models.CharField(
        max_length=30,
        choices=ArtifactCategory.choices,
        default=ArtifactCategory.DIAGNOSTIC_REPORT,
    )
    is_archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    # Operator reason when this artifact replaced a prior primary (re-upload flow).
    reupload_reason = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        """
        Handles:
        - filename normalization
        - extension extraction
        - download filename generation
        - storage path persistence
        """

        if self.pk:
            previous = type(self).objects.filter(pk=self.pk).values("artifact_public_id").first()
            if previous and previous["artifact_public_id"] != self.artifact_public_id:
                raise ValidationError("artifact_public_id is immutable and cannot be changed.")

        if not self.report_public_id:
            self.report_public_id = self.report_id
        if self.uploaded_by_id and not self.uploaded_by_user_uuid:
            self.uploaded_by_user_uuid = self.uploaded_by_id
        if not self.artifact_version:
            self.artifact_version = self.version or 1

        if self.file and not self.original_filename:
            uploaded_name = getattr(self.file, "name", None)

            if uploaded_name:
                self.original_filename = uploaded_name.split("/")[-1]

        if self.file:
            extension = Path(self.file.name).suffix.lower().replace(".", "")
            self.file_extension = extension

        if not self.download_filename:
            self.download_filename = build_report_download_filename(
                self.report,
                extension=self.file_extension or "pdf",
            )

        super().save(*args, **kwargs)

        if self.file and not self.storage_path:
            self.storage_path = self.file.name
            if not self.storage_key:
                self.storage_key = self.file.name
                super().save(update_fields=["storage_path", "storage_key"])
            else:
                super().save(update_fields=["storage_path"])
        elif self.file and not self.storage_key:
            self.storage_key = self.file.name
            super().save(update_fields=["storage_key"])

    def clean(self):
        """
        Prevents multiple primary artifacts
        for the same report workflow.
        """

        if self.is_primary:
            existing_primary = DiagnosticReportArtifact.objects.filter(
                report=self.report,
                is_primary=True,
                is_active=True,
            )

            if self.pk:
                existing_primary = existing_primary.exclude(pk=self.pk)

            if existing_primary.exists():
                raise ValidationError(
                    "Only one primary artifact is allowed per report."
                )

    class Meta:
        indexes = [
            models.Index(fields=["report"]),
            models.Index(fields=["artifact_type"]),
            models.Index(fields=["uploaded_at"]),
            models.Index(fields=["is_primary"]),
            models.Index(fields=["version"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["patient_profile_uuid", "artifact_state", "uploaded_at"]),
            models.Index(fields=["patient_account_uuid", "artifact_state", "uploaded_at"]),
            models.Index(fields=["report", "artifact_type", "artifact_state", "is_active"]),
            models.Index(fields=["checksum_sha256", "report", "is_active"]),
        ]
        # Multiple active artifacts of the same type are allowed (multi-artifact append).
        # Uniqueness of primary remains enforced in clean().

    def __str__(self):
        return f"Artifact - {self.report_id}"


# Public exports for diagnostics reporting domain.
# Keeps imports standardized across services.
__all__ = [
    "DiagnosticReport",
    "DiagnosticTestReport",
    "DiagnosticReportArtifact",
]

