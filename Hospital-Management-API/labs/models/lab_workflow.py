from django.db import models
from django.utils.translation import gettext_lazy as _

from account.models import User
from core.models import BaseModel
from labs.choices.workflow import (
    AppointmentStatus,
    CollectionStatus,
    LabAssignmentStatus,
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

