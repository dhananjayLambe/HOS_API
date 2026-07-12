"""Constants for clinical documentation audit integration."""

SERVICE_NAME = "clinical_documentation"
MAX_CHANGED_FIELDS = 32

SOURCE_TO_AUDIT_SOURCE = {
    "doctor": "doctor",
    "helpdesk": "helpdesk",
    "system": "system",
    "patient": "patient",
    "admin": "admin",
}

DIAGNOSIS_TRACKED_FIELDS = (
    "diagnosis_type",
    "severity",
    "is_primary",
    "display_name",
    "doctor_note",
    "is_chronic",
    "icd_code",
)
