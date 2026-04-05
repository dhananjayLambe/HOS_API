from __future__ import annotations

# Contract: per-field source attribution (Phase 1 uses default / system / template).
AUTOFILL_SOURCE = (
    "doctor",
    "diagnosis",
    "patient",
    "system",
    "template",
    "default",
)

DEFAULT_TIMING_RELATION = "after_food"
DEFAULT_TIME_SLOTS: tuple[str, ...] = ("morning", "night")

FREQUENCY_CODE = "BD"
FREQUENCY_DISPLAY = "Twice Daily"

DEFAULT_DURATION_VALUE = 5
DEFAULT_DURATION_UNIT = "days"
