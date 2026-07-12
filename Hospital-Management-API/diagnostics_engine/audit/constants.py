"""Constants for diagnostic audit integration."""

SERVICE_NAME = "diagnostics_engine"

SOURCE_TO_AUDIT_SOURCE = {
    "doctor": "doctor",
    "helpdesk": "helpdesk",
    "system": "system",
    "patient": "patient",
    "admin": "admin",
    "lab": "system",
}

VIEWER_ROLE_MAP = {
    "doctor": "Doctor",
    "patient": "Patient",
    "helpdesk": "Helpdesk",
    "admin": "Admin",
}
