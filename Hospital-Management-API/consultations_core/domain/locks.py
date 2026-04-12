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

    Exception: investigation line items use validate_investigation_mutation() so orders can be
    amended after consultation_completed until the encounter is closed.
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

    @classmethod
    def validate_investigation_mutation(cls, consultation):
        """
        Investigation items may be added or updated after consultation_completed (while finalized)
        until the encounter is closed. Blocks cancelled/no-show/closed and inconsistent in-progress+finalized.
        """
        if not consultation:
            return

        encounter = consultation.encounter
        st = encounter.status

        if st in ("cancelled", "no_show"):
            raise ValidationError(
                "This visit has been cancelled or is a no-show; cannot modify investigations."
            )
        if st == "closed":
            raise ValidationError("Encounter is closed; cannot modify investigations.")
        if st in ("consultation_completed", "completed"):
            return
        if st == "consultation_in_progress":
            if consultation.is_finalized:
                raise ValidationError(
                    "Consultation is finalized; cannot modify investigations."
                )
            return

        raise ValidationError("Investigations cannot be edited in this encounter state.")
