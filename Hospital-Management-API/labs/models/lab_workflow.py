from django.db import models
from django.utils.translation import gettext_lazy as _

from django.core.exceptions import ValidationError

# =========================================================
# LAB WORKFLOW ARCHITECTURE OVERVIEW
# =========================================================
#
# PHASE 1 FLOW
#
# Encounter
#     -> DiagnosticOrder
#         -> DiagnosticOrderItem
#             -> DiagnosticOrderTestLine
#
# DiagnosticOrder
#     -> LabOrderAssignment (single lab ownership)
#     -> LabCollectionRequest (home collection workflow)
#     -> LabVisitAppointment (branch visit workflow)
#     -> LabOrderTestExecution (per-test execution tracking)
#
# ---------------------------------------------------------
# RESPONSIBILITY SPLIT
# ---------------------------------------------------------
#
# DiagnosticOrder
#     Clinical/commercial container.
#     Represents what the doctor prescribed.
#
# LabOrderAssignment
#     Tracks operational ownership of the order by a lab.
#
# LabCollectionRequest
#     Handles home collection workflow at ORDER level.
#
# LabVisitAppointment
#     Handles branch/radiology visit workflow at ORDER level.
#
# LabOrderTestExecution
#     Lowest operational execution unit.
#     Tracks each individual test execution lifecycle.
#
# ---------------------------------------------------------
# IMPORTANT DESIGN DECISIONS
# ---------------------------------------------------------
#
# - Collection and visit workflows remain ORDER level.
# - Test execution workflows remain TEST level.
# - One order may contain multiple test executions.
# - Future multi-lab routing will happen at
#   LabOrderTestExecution level.
# - DiagnosticOrder should NEVER be split because of routing.
# - Reports are expected to attach per test execution/test line.
#
# ---------------------------------------------------------
# FUTURE READY CAPABILITIES
# ---------------------------------------------------------
#
# - Partial execution
# - Multi-lab execution
# - Recollection workflows
# - No-show handling
# - Retry/reprocessing
# - Technician assignment
# - Per-test report lifecycle
# - SLA tracking
# - Hybrid workflows
#
# =========================================================

from account.models import User
from core.models import BaseModel
from labs.choices.workflow import (
    AppointmentStatus,
    CollectionStatus,
    LabAssignmentStatus,
    TestExecutionStatus,
    TestExecutionType,
)

#=========================================================
# LAB ORDER ASSIGNMENT
# =========================================================
class LabOrderAssignment(BaseModel):
    """
    Tracks diagnostic order assignment lifecycle between
    DoctorPro orchestration layer and executing lab branch.

    This model should NOT own the order itself.
    It only tracks assignment + execution ownership.

    PHASE 1:
    - One diagnostic order -> one lab assignment.
    - Lab either accepts or rejects the FULL order.

    FUTURE:
    - Partial execution support will happen at
      LabOrderTestExecution level.
    - This model should remain order-level ownership only.
    """

    diagnostic_order = models.OneToOneField(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.CASCADE,
        related_name="lab_assignment",
    )

    lab_branch = models.ForeignKey(
        "labs.LabBranch",
        on_delete=models.CASCADE,
        related_name="assigned_orders",
    )

    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_order_assignments_created",
    )

    status = models.CharField(
        max_length=30,
        choices=LabAssignmentStatus.choices,
        default=LabAssignmentStatus.PENDING,
        db_index=True,
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
    )

    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True,
    )

    internal_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_(
            "Internal operational notes for lab coordination.",
        ),
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "lab_order_assignments"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["lab_branch"]),
            models.Index(fields=["assigned_at"]),
        ]

    def __str__(self):
        return (
            f"{self.diagnostic_order_id} - "
            f"{self.lab_branch.branch_name}"
        )



# =========================================================
# LAB COLLECTION REQUEST
# =========================================================
class LabCollectionRequest(BaseModel):
    """
    Handles home sample collection workflow.

    Stores:
    - patient preferred slot
    - assigned phlebotomist
    - collection lifecycle
    - address snapshot

    IMPORTANT:
    This workflow intentionally remains ORDER level.

    One home collection visit may collect:
    - CBC
    - HbA1c
    - Lipid Profile

    under a single collection workflow.

    Per-test operational tracking is handled by
    LabOrderTestExecution.
    """

    diagnostic_order = models.OneToOneField(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.CASCADE,
        related_name="collection_request",
    )

    lab_branch = models.ForeignKey(
        "labs.LabBranch",
        on_delete=models.CASCADE,
        related_name="collection_requests",
    )

    assigned_phlebotomist = models.ForeignKey(
        "labs.LabUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_collection_requests",
    )

    preferred_date = models.DateField(
        db_index=True,
    )

    preferred_slot = models.CharField(
        max_length=30,
    )

    confirmed_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
    )

    confirmed_slot = models.CharField(
        max_length=30,
        blank=True,
        null=True,
    )

    collection_status = models.CharField(
        max_length=30,
        choices=CollectionStatus.choices,
        default=CollectionStatus.PENDING,
        db_index=True,
    )

    collection_type = models.CharField(
        max_length=20,
        default="HOME",
        db_index=True,
        help_text=_("Logistics channel snapshot, e.g. HOME, PARTNER, CAMP."),
    )

    retry_count = models.PositiveSmallIntegerField(
        default=0,
    )

    assigned_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    in_progress_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    failed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    address_snapshot = models.JSONField(
        default=dict,
        help_text=_(
            "Immutable patient address snapshot captured at booking time.",
        ),
    )

    patient_notes = models.TextField(
        blank=True,
        null=True,
    )

    internal_notes = models.TextField(
        blank=True,
        null=True,
    )

    collected_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancellation_reason = models.TextField(
        blank=True,
        null=True,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "lab_collection_requests"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["collection_status"]),
            models.Index(fields=["preferred_date"]),
            models.Index(fields=["confirmed_date"]),
            models.Index(fields=["lab_branch"]),
        ]

    def __str__(self):
        return (
            f"{self.diagnostic_order_id} - "
            f"{self.collection_status}"
        )


# =========================================================
# LAB VISIT APPOINTMENT
# =========================================================
class LabVisitAppointment(BaseModel):
    """
    Tracks walk-in, imaging, radiology,
    and scheduled in-lab appointments.

    Useful for:
    - MRI
    - CT Scan
    - X-Ray
    - ECG
    - Ultrasound

    IMPORTANT:
    This workflow intentionally remains ORDER level.

    A patient may visit the branch once and complete:
    - MRI
    - ECG
    - X-Ray

    under a single visit workflow.

    Individual execution lifecycle tracking remains
    inside LabOrderTestExecution.
    """

    diagnostic_order = models.OneToOneField(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.CASCADE,
        related_name="visit_appointment",
    )

    lab_branch = models.ForeignKey(
        "labs.LabBranch",
        on_delete=models.CASCADE,
        related_name="visit_appointments",
    )

    appointment_date = models.DateField(
        db_index=True,
    )

    appointment_slot = models.CharField(
        max_length=30,
    )

    status = models.CharField(
        max_length=30,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.PENDING,
        db_index=True,
    )

    instructions = models.TextField(
        blank=True,
        null=True,
        help_text=_(
            "Patient preparation instructions like fasting requirements.",
        ),
    )

    patient_notes = models.TextField(
        blank=True,
        null=True,
    )

    internal_notes = models.TextField(
        blank=True,
        null=True,
    )

    checked_in_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancellation_reason = models.TextField(
        blank=True,
        null=True,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "lab_visit_appointments"
        ordering = ["-appointment_date"]

        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["appointment_date"]),
            models.Index(fields=["lab_branch"]),
        ]

    def __str__(self):
        return (
            f"{self.diagnostic_order_id} - "
            f"{self.appointment_date}"
        )


# =========================================================
# LAB ORDER TEST EXECUTION
# =========================================================
class LabOrderTestExecution(BaseModel):
    """
    Lowest operational execution unit for diagnostics.

    Each row represents:
    - one executable diagnostic test
    - one operational execution workflow
    - one executing lab branch

    Future ready for:
    - multi-lab routing
    - partial order execution
    - recollection workflows
    - no-show handling
    - retry execution
    - technician assignment
    - per-test report lifecycle

    FLOW:
    DiagnosticOrder
        -> DiagnosticOrderItem
            -> DiagnosticOrderTestLine
                -> LabOrderTestExecution

    Example:
    One order may contain:
    - CBC
    - MRI
    - ECG

    Each test can independently:
    - execute
    - fail
    - complete
    - no-show
    - generate report

    without affecting the clinical integrity
    of the parent DiagnosticOrder.

    IMPORTANT:
    This model is intentionally designed with:
    ForeignKey(test_line)

    instead of OneToOneField(test_line)

    so future workflows can support:
    - recollection
    - reassignment
    - retry execution
    - repeat processing

    NOTE:
    This model intentionally does NOT enforce
    unique(test_line) constraints.

    This allows future support for:
    - recollection
    - retry processing
    - machine failure recovery
    - re-assignment workflows

    DATA INTEGRITY:
    DiagnosticOrder and DiagnosticOrderItem are intentionally
    NOT duplicated inside this model.

    They are derived through:
    test_line -> order_item -> diagnostic_order

    This prevents future cross-order data corruption.
    """

    assignment = models.ForeignKey(
        "labs.LabOrderAssignment",
        on_delete=models.CASCADE,
        related_name="test_executions",
    )

    test_line = models.ForeignKey(
        "diagnostics_engine.DiagnosticOrderTestLine",
        on_delete=models.CASCADE,
        related_name="lab_test_executions",
    )

    lab_branch = models.ForeignKey(
        "labs.LabBranch",
        on_delete=models.CASCADE,
        related_name="lab_test_executions",
    )

    collection_request = models.ForeignKey(
        "labs.LabCollectionRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_executions",
        help_text=_(
            "Associated home collection workflow for this test execution.",
        ),
    )

    visit_appointment = models.ForeignKey(
        "labs.LabVisitAppointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_executions",
        help_text=_(
            "Associated branch visit workflow for this test execution.",
        ),
    )

    execution_status = models.CharField(
        max_length=30,
        choices=TestExecutionStatus.choices,
        default=TestExecutionStatus.PENDING,
        db_index=True,
    )

    execution_type = models.CharField(
        max_length=30,
        choices=TestExecutionType.choices,
        default=TestExecutionType.BRANCH_VISIT,
    )

    assigned_phlebotomist = models.ForeignKey(
        "labs.LabUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_test_executions",
    )

    accepted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_test_executions",
    )

    last_updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_test_executions",
    )

    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    failed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    sample_collected_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    report_ready_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True,
    )

    cancellation_reason = models.TextField(
        blank=True,
        null=True,
    )

    internal_notes = models.TextField(
        blank=True,
        null=True,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    @property
    def is_home_collection(self):
        return self.execution_type == TestExecutionType.HOME_COLLECTION

    @property
    def is_branch_visit(self):
        return self.execution_type == TestExecutionType.BRANCH_VISIT

    class Meta:
        db_table = "lab_order_test_executions"

        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["execution_status"]),
            models.Index(fields=["lab_branch"]),
            models.Index(fields=["collection_request"]),
            models.Index(fields=["visit_appointment"]),
            models.Index(fields=["scheduled_at"]),
            models.Index(fields=["assignment"]),
            models.Index(fields=["test_line"]),
            models.Index(fields=["execution_type"]),
            models.Index(fields=["accepted_at"]),
            models.Index(fields=["completed_at"]),
        ]

    def clean(self):
        """
        Prevent invalid workflow linkage combinations.
        """

        if (
            self.collection_request
            and self.visit_appointment
        ):
            raise ValidationError(
                "Execution cannot belong to both collection and visit workflows.",
            )

        if (
            self.execution_type == TestExecutionType.HOME_COLLECTION
            and not self.collection_request
        ):
            raise ValidationError(
                "Home collection executions require collection_request.",
            )

        if (
            self.execution_type == TestExecutionType.BRANCH_VISIT
            and not self.visit_appointment
            and self.execution_status != TestExecutionStatus.PENDING
        ):
            raise ValidationError(
                "Branch visit executions require visit_appointment once active.",
            )

        if (
            self.assignment_id
            and self.lab_branch_id
        ):
            if (
                self.assignment.lab_branch_id
                != self.lab_branch_id
            ):
                raise ValidationError(
                    "Execution branch must match assignment branch.",
                )

        if (
            self.assignment_id
            and self.test_line_id
        ):
            if (
                self.test_line.order_id
                != self.assignment.diagnostic_order_id
            ):
                raise ValidationError(
                    "Test line must belong to assignment diagnostic order.",
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.assignment.diagnostic_order_id} - "
            f"{self.test_line_id} - "
            f"{self.execution_status}"
        )

