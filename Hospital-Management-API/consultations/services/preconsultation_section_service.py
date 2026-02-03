from django.core.exceptions import ValidationError
from django.utils import timezone


class PreConsultationSectionService:
    """
    Central handler for all PreConsultation section models.
    Works for vitals, chief_complaint, allergies, medical_history, etc.
    """

    @staticmethod
    def upsert_section(
        *,
        section_model,
        preconsultation,
        data,
        user=None,
        schema_version="v1"
    ):
        """
        Create or update a section safely.
        """

        # 🔒 Lock enforcement
        if preconsultation.is_locked:
            raise ValidationError(
                "Pre-consultation is locked and cannot be modified"
            )

        # 🧠 Upsert logic
        obj, created = section_model.objects.get_or_create(
            pre_consultation=preconsultation,
            defaults={
                "data": data,
                "schema_version": schema_version,
                "created_by": user,
                "updated_by": user,
            }
        )

        if not created:
            obj.data = data
            obj.schema_version = schema_version
            obj.updated_by = user
            obj.updated_at = timezone.now()
            obj.save(update_fields=[
                "data",
                "schema_version",
                "updated_by",
                "updated_at"
            ])

        return obj