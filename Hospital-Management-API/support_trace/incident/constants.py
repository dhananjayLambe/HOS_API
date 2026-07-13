"""Incident reconstruction constants."""

from __future__ import annotations

# Performance targets (ms) — soft asserts in tests
PERFORMANCE_TARGETS_MS: dict[str, float] = {
    "booking": 300.0,
    "workflow": 350.0,
    "patient": 500.0,
    "correlation": 400.0,
    "deep": 800.0,
    "reconstruct_any": 400.0,
}

# Workflow types that commonly have retries
RETRY_WORKFLOW_TYPES: tuple[str, ...] = (
    "Recommendation",
    "Booking",
    "ReportDelivery",
    "WhatsAppDelivery",
    "Payment",
)

# Narrative sentence templates (deterministic)
NARRATIVE_STAGE_COMPLETED = "{stage} completed successfully."
NARRATIVE_STAGE_FAILED = "{stage} failed: {reason}."
NARRATIVE_RETRY = "{stage} retried {count} time(s) before {outcome}."
NARRATIVE_DURATION = "Total workflow duration was {duration}."

# Recommendation rules: (failure_type or workflow, action)
RECOMMENDATION_RULES: tuple[tuple[str, str], ...] = (
    ("WhatsAppDelivery", "Retry WhatsApp Delivery"),
    ("Provider", "Verify Provider Status"),
    ("Routing", "Re-run Routing"),
    ("Routing", "Check Laboratory SLA"),
    ("ReportDelivery", "Verify Report Availability"),
    ("Timeout", "Check service health and retry"),
    ("Payment", "Verify payment gateway status"),
)

# Entity field mapping for journey chain
JOURNEY_ENTITY_FIELDS: tuple[tuple[str, str], ...] = (
    ("patient", "patient_account_id"),
    ("consultation", "consultation_id"),
    ("recommendation", "recommendation_id"),
    ("booking", "booking_id"),
    ("routing", "routing_id"),
    ("report", "report_id"),
    ("delivery", "order_id"),
    ("whatsapp", "whatsapp_message_id"),
    ("payment", "payment_id"),
)
