"""Constants for identifier detection and search."""

from __future__ import annotations

from django.db import models

WHATSAPP_PREFIX = "wamid."
PAYMENT_PREFIX = "pay_"
RAZORPAY_PREFIX = "rzp_"

PHONE_MIN_DIGITS = 10
PHONE_MAX_DIGITS = 15

PARTIAL_SEARCH_LIMIT = 25
PROVIDER_REFERENCE_MAX_LENGTH = 256

# UUID field probe order for ambiguous UUID inputs (highest priority first)
UUID_PROBE_PRIORITY: tuple[str, ...] = (
    "booking_id",
    "consultation_id",
    "report_id",
    "recommendation_id",
    "order_id",
    "routing_id",
    "prescription_id",
    "patient_account_id",
    "patient_profile_id",
    "encounter_id",
    "payment_id",
    "invoice_id",
    "laboratory_id",
    "branch_id",
)


class SearchStrategy(models.TextChoices):
    EXACT = "exact", "Exact"
    PREFIX = "prefix", "Prefix"
    PARTIAL = "partial", "Partial"
    RELATIONSHIP = "relationship", "Relationship"
