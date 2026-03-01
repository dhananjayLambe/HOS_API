from django.db import IntegrityError
from django.utils import timezone
from consultations_core.models.pre_consultation import PreConsultation


class PreConsultationAlreadyExistsError(Exception):
    """Raised when create_preconsultation hits a duplicate (race); do not run more queries in same transaction."""

    def __init__(self, encounter):
        self.encounter = encounter
        super().__init__("PreConsultation already exists for this encounter (race). Retry in a new request.")


class PreConsultationService:
    """
    Business logic for PreConsultation lifecycle.
    """

    @staticmethod
    def create_preconsultation(
        *,
        encounter,
        specialty_code,
        template_version="v1",
        entry_mode="helpdesk",
        created_by=None
    ):
        """
        Create pre-consultation for an encounter.
        Returns existing if one already exists (idempotent under race).
        """
        if PreConsultation.objects.filter(encounter=encounter).exists():
            return PreConsultation.objects.get(encounter=encounter)

        try:
            return PreConsultation.objects.create(
                encounter=encounter,
                specialty_code=specialty_code,
                template_version=template_version,
                entry_mode=entry_mode,
                created_by=created_by,
                updated_by=created_by,
            )
        except IntegrityError:
            # Do not run .get() here: transaction is marked for rollback; any query raises TransactionManagementError.
            raise PreConsultationAlreadyExistsError(encounter)

    @staticmethod
    def mark_completed(preconsultation, user=None):
        if preconsultation.is_locked:
            raise ValueError("Cannot complete a locked PreConsultation")

        preconsultation.is_completed = True
        preconsultation.completed_at = timezone.now()
        preconsultation.updated_by = user
        preconsultation.save(update_fields=["is_completed", "completed_at", "updated_by"])

    @staticmethod
    def lock(preconsultation, reason="Consultation started", user=None):
        """
        Locks pre-consultation once doctor starts consultation.
        """
        if preconsultation.is_locked:
            return  # idempotent

        preconsultation.is_locked = True
        preconsultation.locked_at = timezone.now()
        preconsultation.lock_reason = reason
        preconsultation.updated_by = user

        preconsultation.save(
            update_fields=["is_locked", "locked_at", "lock_reason", "updated_by"]
        )