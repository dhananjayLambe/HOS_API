"""Constants for consultation audit integration."""

SERVICE_NAME = "consultations_core"
MAX_CHANGED_FIELDS = 32

SOURCE_TO_AUDIT_SOURCE = {
    "doctor": "doctor",
    "helpdesk": "helpdesk",
    "system": "system",
    "patient": "patient",
    "admin": "admin",
}
