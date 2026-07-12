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
    CONSULTATION_FINDINGS_UPDATED = (
        "consultation.findings.updated",
        "Consultation Findings Updated",
    )
    CONSULTATION_INSTRUCTIONS_UPDATED = (
        "consultation.instructions.updated",
        "Consultation Instructions Updated",
    )
    CONSULTATION_INVESTIGATIONS_UPDATED = (
        "consultation.investigations.updated",
        "Consultation Investigations Updated",
    )
    CONSULTATION_REOPENED = "consultation.reopened", "Consultation Reopened"

    # Diagnosis
    DIAGNOSIS_ADDED = "diagnosis.added", "Diagnosis Added"
    DIAGNOSIS_UPDATED = "diagnosis.updated", "Diagnosis Updated"
    DIAGNOSIS_REMOVED = "diagnosis.removed", "Diagnosis Removed"

    # Allergy
    ALLERGY_ADDED = "allergy.added", "Allergy Added"
    ALLERGY_UPDATED = "allergy.updated", "Allergy Updated"

    # Clinical notes
    CLINICAL_NOTES_UPDATED = "clinical_notes.updated", "Clinical Notes Updated"

    # Vital signs
    VITAL_SIGNS_RECORDED = "vitals.recorded", "Vital Signs Recorded"

    # Symptoms
    SYMPTOMS_RECORDED = "symptoms.recorded", "Symptoms Recorded"

    # Prescription
    PRESCRIPTION_CREATED = "prescription.created", "Prescription Created"
    PRESCRIPTION_SIGNED = "prescription.signed", "Prescription Signed"
    PRESCRIPTION_GENERATED = "prescription.generated", "Prescription Generated"
    PRESCRIPTION_UPDATED = "prescription.updated", "Prescription Updated"
    PRESCRIPTION_DOWNLOADED = "prescription.downloaded", "Prescription Downloaded"
    PRESCRIPTION_SHARED = "prescription.shared", "Prescription Shared"

    # Investigations
    INVESTIGATION_ADDED = "investigation.added", "Investigation Added"
    INVESTIGATION_UPDATED = "investigation.updated", "Investigation Updated"
    INVESTIGATION_REMOVED = "investigation.removed", "Investigation Removed"
    TEST_ORDERED = "test.ordered", "Test Ordered"

    # Recommendations
    RECOMMENDATION_GENERATED = (
        "recommendation.generated",
        "Laboratory Recommendation Generated",
    )
    RECOMMENDATION_SENT = (
        "recommendation.sent",
        "Laboratory Recommendation Sent",
    )
    RECOMMENDATION_ACCEPTED = (
        "recommendation.accepted",
        "Laboratory Recommendation Accepted",
    )

    # Reports
    REPORT_UPLOADED = "report.uploaded", "Report Uploaded"
    REPORT_APPROVED = "report.approved", "Report Approved"
    REPORT_VIEWED = "report.viewed", "Report Viewed"
    REPORT_DOWNLOADED = "report.downloaded", "Report Downloaded"
    REPORT_SHARED = "report.shared", "Report Shared"

    # Follow-up
    FOLLOW_UP_SCHEDULED = "follow_up.scheduled", "Follow-up Scheduled"
    FOLLOW_UP_COMPLETED = "follow_up.completed", "Follow-up Completed"


class ClinicalEntity(models.TextChoices):
    """Clinical resource / entity types referenced by an audit record."""

    PATIENT = "patient", "Patient"
    CONSULTATION = "consultation", "Consultation"
    ENCOUNTER = "encounter", "Encounter"
    DIAGNOSIS = "diagnosis", "Diagnosis"
    ALLERGY = "allergy", "Allergy"
    CLINICAL_NOTES = "clinical_notes", "Clinical Notes"
    VITAL_SIGNS = "vitals", "Vital Signs"
    SYMPTOMS = "symptoms", "Symptoms"
    PRESCRIPTION = "prescription", "Prescription"
    INVESTIGATION = "investigation", "Investigation"
    DIAGNOSTIC_TEST = "diagnostic_test", "Diagnostic Test"
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
