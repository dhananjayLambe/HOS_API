from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel

from diagnostics_engine.choices.routing import (
    AssignmentStatus,
    AssignmentType,
    RecommendationConfidence,
    RecommendationLabel,
    RoutingEventType,
    RoutingLocationSource,
    RoutingStatus,
    RoutingStrategy,
)


# =========================================================
# DIAGNOSTIC ROUTING ENGINE
# =========================================================
#
# Routing architecture:
#
# Consultation
#     ↓
# InvestigationItem
#     ↓
# DiagnosticOrder
#     ↓
# DiagnosticOrderItem
#     ↓
# DiagnosticOrderTestLine
#     ↓
# RoutingRun
#     ↓
# EligibleLabSnapshot
#     - is_eligible=True, ranking_position set  →  ranked winner path (below continues)
#     - is_eligible=False, ranking_position null →  no-match samples only; chain stops here
#         (still: RoutingEvent NO_ELIGIBLE_LABS + ROUTING_COMPLETED on that run)
#     ↓  (eligible ranked path only)
# RoutingDecisionSnapshot (one per eligible ranked snapshot)
#     ↓
# RoutingLabOrderAssignment (single winner row)
#     ↓
# RoutingEvent (LAB_SUGGESTED, ASSIGNMENT_CREATED, ROUTING_COMPLETED, …)
#     ↓
# Lab Dashboard
#
# =========================================================
# IMPORTANT DESIGN PRINCIPLES
# =========================================================
#
# 1. Routing NEVER blocks consultation flow.
#
# 2. Routing is asynchronous + retryable.
#
# 3. Routing stores snapshots for auditability.
#
# 4. Routing supports future AI explainability.
#
# 5. Routing supports incomplete patient data.
#    Fallback:
#       patient location -> clinic location.
#
# 6. Routing is marketplace-ready.
#
# 7. Routing keeps lightweight operational references
#    for:
#    - encounter tracking
#    - lab dashboards
#    - patient workflows
#    - doctor workflows
#    - operational reporting
#
# =========================================================

# =========================================================
# ROUTING RUN
# =========================================================
#
# Represents one routing orchestration execution.
#
# Supports:
# - retries
# - rerouting
# - async processing
# - failure handling
# - orchestration observability
#
# =========================================================
class RoutingRun(BaseModel):
    diagnostic_order = models.ForeignKey(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.CASCADE,
        related_name="routing_runs",
    )

    # =====================================================
    # OPERATIONAL CONTEXT REFERENCES
    # =====================================================
    #
    # These references make routing operationally self-contained.
    #
    # Labs frequently search using:
    # - encounter id
    # - patient
    # - doctor
    # - clinic
    #
    # instead of internal diagnostic order ids.
    #
    # Keeping lightweight references avoids deep ORM joins
    # across consultation modules during operational workflows.
    # =====================================================

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_runs",
    )

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_runs",
    )

    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_runs",
    )

    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_runs",
    )

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_routing_runs",
    )

    # Lightweight operational snapshots.
    #
    # These help preserve routing explainability even if
    # master data changes later.

    encounter_display_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    patient_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    patient_phone_snapshot = models.CharField(
        max_length=30,
        blank=True,
        null=True,
    )

    clinic_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    doctor_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    routing_status = models.CharField(
        max_length=30,
        choices=RoutingStatus.choices,
        default=RoutingStatus.PENDING,
        db_index=True,
    )

    routing_strategy = models.CharField(
        max_length=30,
        choices=RoutingStrategy.choices,
        default=RoutingStrategy.HYBRID,
    )

    routing_trigger_source = models.CharField(
        max_length=50,
        blank=True,
        default="consultation_completion",
    )

    routing_engine_version = models.CharField(
        max_length=32,
        default="v1",
        db_index=True,
        help_text="Algorithm version for historical analytics (e.g. v1, ai_v1).",
    )

    resolved_location_source = models.CharField(
        max_length=50,
        choices=RoutingLocationSource.choices,
        default=RoutingLocationSource.CLINIC_PINCODE,
    )

    resolved_pincode = models.CharField(max_length=20, blank=True, null=True)

    resolved_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    resolved_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    requested_collection_mode = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    retry_count = models.PositiveSmallIntegerField(default=0)

    last_retry_at = models.DateTimeField(null=True, blank=True)

    error_message = models.TextField(blank=True, null=True)

    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_runs_triggered",
    )

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["routing_status"]),
            models.Index(fields=["routing_strategy"]),
            models.Index(fields=["routing_engine_version"]),
            models.Index(fields=["resolved_pincode"]),
            models.Index(fields=["encounter"]),
            models.Index(fields=["consultation"]),
            models.Index(fields=["patient_profile"], name="diagnostics_patient_91c38d_idx"),
            models.Index(fields=["clinic"]),
            models.Index(fields=["doctor"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"RoutingRun - {self.diagnostic_order_id}"


# =========================================================
# ELIGIBLE LAB SNAPSHOT
# =========================================================
#
# Stores eligible labs ranked during routing, and a capped set of ineligible
# branch samples when no lab qualifies (is_eligible=False, ranking_position null)
# for operational explainability. Reject-sample rows never get a
# RoutingDecisionSnapshot or RoutingLabOrderAssignment.
#
# Snapshot-based design ensures historical routing
# explainability even after:
# - pricing changes
# - TAT changes
# - capability changes
#
# =========================================================
class EligibleLabSnapshot(BaseModel):
    routing_run = models.ForeignKey(
        RoutingRun,
        on_delete=models.CASCADE,
        related_name="eligible_labs",
    )

    diagnostic_order = models.ForeignKey(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.CASCADE,
        related_name="eligible_lab_snapshots",
    )

    # Operational context snapshots.
    #
    # Preserved for explainability and operational analytics.

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eligible_lab_snapshots",
    )

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eligible_lab_snapshots",
    )

    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eligible_lab_snapshots",
    )

    lab = models.ForeignKey(
        "labs.LabOrganization",
        on_delete=models.CASCADE,
        related_name="routing_snapshots",
    )

    branch = models.ForeignKey(
        "labs.LabBranch",
        on_delete=models.CASCADE,
        related_name="routing_snapshots",
    )

    is_eligible = models.BooleanField(default=True)

    supports_home_collection = models.BooleanField(default=False)
    supports_all_tests = models.BooleanField(default=True)

    distance_km = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    estimated_tat_hours = models.PositiveIntegerField(null=True, blank=True)

    estimated_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    eligibility_score = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
    )

    ranking_position = models.PositiveIntegerField(null=True, blank=True)

    distance_source = models.CharField(
        max_length=50,
        choices=RoutingLocationSource.choices,
        default=RoutingLocationSource.CLINIC_PINCODE,
    )

    missing_tests_snapshot = models.JSONField(default=list, blank=True)

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["ranking_position", "distance_km"]
        indexes = [
            models.Index(fields=["routing_run"]),
            models.Index(fields=["lab"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["ranking_position"]),
            models.Index(fields=["encounter"]),
            models.Index(fields=["consultation"]),
            models.Index(fields=["patient_profile"], name="diagnostics_patient_d7556a_idx"),
            models.Index(fields=["estimated_price"]),
            models.Index(fields=["distance_km"]),
            models.Index(fields=["estimated_tat_hours"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["routing_run", "lab", "branch"],
                name="uniq_routing_run_lab_branch",
            )
        ]

    def __str__(self):
        return f"EligibleLabSnapshot - {self.branch_id}"


# =========================================================
# ROUTING DECISION SNAPSHOT
# =========================================================
#
# Stores WHY a specific lab was recommended.
#
# Future-ready for:
# - AI explainability
# - recommendation transparency
# - scoring analytics
# - ranking optimization
#
# =========================================================
class RoutingDecisionSnapshot(BaseModel):
    routing_run = models.ForeignKey(
        RoutingRun,
        on_delete=models.CASCADE,
        related_name="decision_snapshots",
    )

    eligible_lab_snapshot = models.OneToOneField(
        EligibleLabSnapshot,
        on_delete=models.CASCADE,
        related_name="decision_snapshot",
    )

    # Operational references preserved for routing explainability.

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_decision_snapshots",
    )

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_decision_snapshots",
    )

    decision_type = models.CharField(
        max_length=30,
        choices=RoutingStrategy.choices,
        default=RoutingStrategy.HYBRID,
    )

    recommendation_label = models.CharField(
        max_length=30,
        choices=RecommendationLabel.choices,
        default=RecommendationLabel.RECOMMENDED,
    )

    recommendation_labels = models.JSONField(
        default=list,
        blank=True,
        help_text="Multi-label recommendations (e.g. cheapest + recommended).",
    )

    recommendation_confidence = models.CharField(
        max_length=20,
        choices=RecommendationConfidence.choices,
        default=RecommendationConfidence.MEDIUM,
    )

    distance_score = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    price_score = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    tat_score = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    quality_score = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    partner_score = models.DecimalField(max_digits=10, decimal_places=4, default=0)

    final_score = models.DecimalField(max_digits=10, decimal_places=4, default=0)

    decision_reason = models.TextField(blank=True, null=True)

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-final_score"]
        indexes = [
            models.Index(fields=["routing_run"]),
            models.Index(fields=["recommendation_label"]),
            models.Index(fields=["recommendation_confidence"]),
            models.Index(fields=["final_score"]),
            models.Index(fields=["encounter"]),
            models.Index(fields=["consultation"]),
        ]

    def __str__(self):
        return f"RoutingDecisionSnapshot - {self.eligible_lab_snapshot_id}"


# =========================================================
# LAB ORDER ASSIGNMENT
# =========================================================
#
# Represents actual operational ownership.
#
# IMPORTANT:
# Recommendation != assignment.
#
# Assignment means:
# operational responsibility accepted by provider.
#
# =========================================================
class RoutingLabOrderAssignment(BaseModel):
    diagnostic_order = models.ForeignKey(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.CASCADE,
        related_name="lab_assignments",
    )

    # =====================================================
    # OPERATIONAL REFERENCES
    # =====================================================
    #
    # Assignment becomes the main operational work queue.
    #
    # Labs primarily work using:
    # - encounter id
    # - patient details
    # - clinic details
    # - doctor details
    #
    # rather than internal routing ids.
    # =====================================================

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_assignments",
    )

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_assignments",
    )

    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_assignments",
    )

    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_assignments",
    )

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_lab_assignments",
    )

    # Lightweight immutable operational snapshots.
    #
    # These help preserve operational visibility even if
    # source entities later change.

    encounter_display_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    patient_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    patient_phone_snapshot = models.CharField(
        max_length=30,
        blank=True,
        null=True,
    )

    clinic_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    doctor_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    routing_run = models.ForeignKey(
        RoutingRun,
        on_delete=models.CASCADE,
        related_name="assignments",
    )

    selected_snapshot = models.ForeignKey(
        EligibleLabSnapshot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments",
    )

    selected_decision = models.ForeignKey(
        RoutingDecisionSnapshot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments",
    )

    lab = models.ForeignKey(
        "labs.LabOrganization",
        on_delete=models.CASCADE,
        related_name="diagnostic_routing_assignments",
    )

    branch = models.ForeignKey(
        "labs.LabBranch",
        on_delete=models.CASCADE,
        related_name="diagnostic_assignments",
    )

    assignment_status = models.CharField(
        max_length=30,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.PENDING,
        db_index=True,
    )

    assignment_type = models.CharField(
        max_length=30,
        choices=AssignmentType.choices,
        default=AssignmentType.AUTO,
    )

    assignment_reason = models.TextField(
        blank=True,
        null=True,
    )

    assigned_at = models.DateTimeField(auto_now_add=True)
    viewed_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    expired_at = models.DateTimeField(null=True, blank=True)

    expires_at = models.DateTimeField(null=True, blank=True)

    sla_deadline = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_assignments_created",
    )

    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_assignments_accepted",
    )

    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_assignments_rejected",
    )

    rejection_reason = models.TextField(blank=True, null=True)

    priority = models.PositiveSmallIntegerField(default=0)

    notes = models.TextField(blank=True, null=True)

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["assignment_status"]),
            models.Index(fields=["lab"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["encounter"]),
            models.Index(fields=["consultation"]),
            models.Index(fields=["patient_profile"], name="diagnostics_patient_b7f3c5_idx"),
            models.Index(fields=["clinic"]),
            models.Index(fields=["doctor"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["created_at"]),
        ]

    def clean(self):
        if self.lab_id and self.branch_id:
            if getattr(self.branch, "lab_id", None) != self.lab_id:
                raise ValidationError("Selected branch does not belong to selected lab.")

    def __str__(self):
        return f"RoutingLabOrderAssignment - {self.diagnostic_order_id}"


# =========================================================
# ROUTING EVENT
# =========================================================
#
# Immutable routing audit trail.
#
# Supports:
# - operational debugging
# - analytics
# - auditability
# - event-driven architecture
#
# =========================================================
class RoutingEvent(BaseModel):
    routing_run = models.ForeignKey(
        RoutingRun,
        on_delete=models.CASCADE,
        related_name="events",
    )

    assignment = models.ForeignKey(
        RoutingLabOrderAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )

    diagnostic_order = models.ForeignKey(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.CASCADE,
        related_name="routing_events",
    )

    # Operational linkage for auditability and support workflows.

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_events",
    )

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_events",
    )

    event_type = models.CharField(
        max_length=50,
        choices=RoutingEventType.choices,
        db_index=True,
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routing_events_triggered",
    )

    source = models.CharField(max_length=50, blank=True, default="system")

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["routing_run"]),
            models.Index(fields=["assignment"]),
            models.Index(fields=["diagnostic_order"]),
            models.Index(fields=["encounter"]),
            models.Index(fields=["consultation"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"RoutingEvent - {self.event_type}"


__all__ = [
    "EligibleLabSnapshot",
    "RoutingDecisionSnapshot",
    "RoutingEvent",
    "RoutingLabOrderAssignment",
    "RoutingRun",
]