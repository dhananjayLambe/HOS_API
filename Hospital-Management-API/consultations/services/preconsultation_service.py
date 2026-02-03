from django.utils import timezone
from consultations.models import PreConsultation


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
        Raises error if already exists.
        """
        if hasattr(encounter, "pre_consultation"):
            raise ValueError("PreConsultation already exists for this encounter")

        return PreConsultation.objects.create(
            encounter=encounter,
            specialty_code=specialty_code,
            template_version=template_version,
            entry_mode=entry_mode,
            created_by=created_by,
            updated_by=created_by,
        )

    @staticmethod
    def mark_completed(preconsultation, user=None):
        if preconsultation.is_locked:
            raise ValueError("Cannot complete a locked PreConsultation")

        preconsultation.completed_at = timezone.now()
        preconsultation.updated_by = user
        preconsultation.save(update_fields=["completed_at", "updated_by"])

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