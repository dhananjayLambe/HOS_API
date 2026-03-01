# consultations_core/domain/locks.py

from django.core.exceptions import ValidationError


class EncounterLockValidator:
    """
    Centralized enterprise lock validation.

    Enforces:
    - Encounter completion lock
    - Encounter cancellation lock
    - Encounter no-show lock
    - Consultation finalization lock

    This must be used by all clinical editable models:
    - Symptoms
    - Findings
    - Diagnosis
    - Instructions
    - Prescription
    - Any future clinical sections
    """

    LOCKED_ENCOUNTER_STATUSES = (
        "completed",
        "consultation_completed",
        "closed",
        "cancelled",
        "no_show",
    )

    @classmethod
    def validate(cls, consultation):
        """
        Validates whether modification is allowed.

        Raises ValidationError if:
        - Encounter is completed
        - Encounter is cancelled
        - Encounter is no-show
        - Consultation is finalized
        """

        if not consultation:
            return

        encounter = consultation.encounter

        # 🚫 Encounter-level lock
        if encounter.status in cls.LOCKED_ENCOUNTER_STATUSES:
            raise ValidationError(
                "Encounter is locked. Modifications are not allowed "
                "after completion, cancellation, or no-show."
            )

        # 🚫 Consultation-level lock
        if consultation.is_finalized:
            raise ValidationError(
                "Consultation is finalized. Modifications are not allowed."
            )
