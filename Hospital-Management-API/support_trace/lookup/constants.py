"""Investigation engine constants."""

from __future__ import annotations

# Retry threshold for RETRYING health
RETRY_ATTENTION_THRESHOLD = 3

# SLA duration thresholds (ms) by workflow type
SLA_MS_BY_WORKFLOW: dict[str, int] = {
    "Booking": 30 * 60 * 1000,
    "Routing": 15 * 60 * 1000,
    "ReportDelivery": 60 * 60 * 1000,
    "WhatsAppDelivery": 10 * 60 * 1000,
    "Recommendation": 5 * 60 * 1000,
    "Consultation": 45 * 60 * 1000,
}
DEFAULT_SLA_MS = 30 * 60 * 1000

# Performance targets (ms) by investigation type — soft asserts in tests
PERFORMANCE_TARGETS_MS: dict[str, float] = {
    "workflow": 80.0,
    "booking": 120.0,
    "patient": 200.0,
    "correlation": 200.0,
    "lookup_any": 250.0,
    "lookup_many": 500.0,
    "basic": 50.0,
}

# Expected next step hints by current state (workflow_type -> state -> next)
NEXT_STEP_HINTS: dict[str, dict[str, str]] = {
    "Booking": {
        "Created": "Booking Confirmed",
        "Confirmed": "Routing Started",
    },
    "Routing": {
        "Assigned": "Report Uploaded",
    },
    "ReportDelivery": {
        "Uploaded": "WhatsApp Delivered",
    },
}
