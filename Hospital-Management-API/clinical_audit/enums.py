"""Closed vocabularies for Clinical Audit records."""

from django.db import models


class AuditAction(models.TextChoices):
    """Approved clinical actions recorded in the permanent audit trail."""

    # Authentication
    AUTHENTICATION_LOGIN = "authentication.login", "Authentication Login"
    AUTHENTICATION_LOGOUT = "authentication.logout", "Authentication Logout"
    AUTHENTICATION_FAILED_LOGIN = (
        "authentication.failed_login",
        "Authentication Failed Login",
    )

    # Patient
    PATIENT_RECORD_CREATED = "patient.record_created", "Patient Record Created"
    PATIENT_RECORD_UPDATED = "patient.record_updated", "Patient Record Updated"
    PATIENT_RECORD_VIEWED = "patient.record_viewed", "Patient Record Viewed"
    PATIENT_PROFILE_MERGED = "patient.profile_merged", "Patient Profile Merged"

    # Consultation
    CONSULTATION_STARTED = "consultation.started", "Consultation Started"
    CONSULTATION_COMPLETED = "consultation.completed", "Consultation Completed"
    CONSULTATION_CANCELLED = "consultation.cancelled", "Consultation Cancelled"

    # Diagnosis
    DIAGNOSIS_ADDED = "diagnosis.added", "Diagnosis Added"
    DIAGNOSIS_UPDATED = "diagnosis.updated", "Diagnosis Updated"
    DIAGNOSIS_REMOVED = "diagnosis.removed", "Diagnosis Removed"

    # Prescription
    PRESCRIPTION_GENERATED = "prescription.generated", "Prescription Generated"
    PRESCRIPTION_UPDATED = "prescription.updated", "Prescription Updated"
    PRESCRIPTION_DOWNLOADED = "prescription.downloaded", "Prescription Downloaded"
    PRESCRIPTION_SHARED = "prescription.shared", "Prescription Shared"

    # Investigations
    INVESTIGATION_ADDED = "investigation.added", "Investigation Added"
    INVESTIGATION_UPDATED = "investigation.updated", "Investigation Updated"
    INVESTIGATION_REMOVED = "investigation.removed", "Investigation Removed"

    # Recommendations
    RECOMMENDATION_GENERATED = (
        "recommendation.generated",
        "Laboratory Recommendation Generated",
    )
    RECOMMENDATION_SENT = (
        "recommendation.sent",
        "Laboratory Recommendation Sent",
    )

    # Reports
    REPORT_UPLOADED = "report.uploaded", "Report Uploaded"
    REPORT_APPROVED = "report.approved", "Report Approved"
    REPORT_VIEWED = "report.viewed", "Report Viewed"
    REPORT_DOWNLOADED = "report.downloaded", "Report Downloaded"

    # Follow-up
    FOLLOW_UP_SCHEDULED = "follow_up.scheduled", "Follow-up Scheduled"
    FOLLOW_UP_COMPLETED = "follow_up.completed", "Follow-up Completed"


class ClinicalEntity(models.TextChoices):
    """Clinical resource / entity types referenced by an audit record."""

    PATIENT = "patient", "Patient"
    CONSULTATION = "consultation", "Consultation"
    ENCOUNTER = "encounter", "Encounter"
    DIAGNOSIS = "diagnosis", "Diagnosis"
    PRESCRIPTION = "prescription", "Prescription"
    INVESTIGATION = "investigation", "Investigation"
    RECOMMENDATION = "recommendation", "Recommendation"
    REPORT = "report", "Report"
    FOLLOW_UP = "follow_up", "Follow-up"


class AuditOutcome(models.TextChoices):
    """Result of the clinical action."""

    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"
    PARTIAL = "partial", "Partial"


class AuditSource(models.TextChoices):
    """Channel or actor type that performed the clinical action."""

    SYSTEM = "system", "System"
    DOCTOR = "doctor", "Doctor"
    HELPDESK = "helpdesk", "Helpdesk"
    PATIENT = "patient", "Patient"
    ADMIN = "admin", "Admin"
