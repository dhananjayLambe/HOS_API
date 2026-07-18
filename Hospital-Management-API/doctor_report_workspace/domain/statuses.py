"""Doctor-facing clinical report statuses (Phase 1).

Storage lifecycle (ready/delivered/etc.) stays inside diagnostics_engine.
This module owns only the stable clinical vocabulary shown to doctors.
"""


class ClinicalStatus:
    """Doctor-facing clinical status values."""

    AWAITING_REPORT = "AWAITING_REPORT"
    AVAILABLE = "AVAILABLE"
    UPDATED = "UPDATED"

    CHOICES = (
        (AWAITING_REPORT, "Awaiting Report"),
        (AVAILABLE, "Available"),
        (UPDATED, "Updated"),
    )

    ALL = frozenset({AWAITING_REPORT, AVAILABLE, UPDATED})
