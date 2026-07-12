"""Constants for prescription audit integration."""

SERVICE_NAME = "prescription"
MAX_CHANGED_FIELDS = 32

SOURCE_TO_AUDIT_SOURCE = {
    "doctor": "doctor",
    "helpdesk": "helpdesk",
    "system": "system",
    "patient": "patient",
    "admin": "admin",
}

PRESCRIPTION_TRACKED_FIELDS = (
    "medicine_count",
    "status",
    "version_number",
)
