from django.db import transaction
from django.utils import timezone
from consultations.models import EncounterDailyCounter


class VisitPNRService:
    """
    Production-grade Visit PNR Generator.

    Format:
        YYMMDD-CL-00001-001

    Rules:
        - Per clinic
        - Per day
        - Counter resets daily
        - Concurrency safe
    """

    MIN_DIGITS = 3  # Daily sequence: 001, 002...

    @classmethod
    def generate_pnr(cls, clinic):
        """
        Generate Visit PNR for a clinic.
        """

        if not clinic or not clinic.code:
            raise ValueError("Valid clinic with business code is required.")

        today = timezone.now().date()

        with transaction.atomic():
            counter_obj, _ = (
                EncounterDailyCounter.objects
                .select_for_update()
                .get_or_create(
                    clinic=clinic,
                    date=today,
                    defaults={"counter": 0}
                )
            )

            # Increment daily counter
            counter_obj.counter += 1
            counter_obj.save(update_fields=["counter"])

            # Format parts
            date_part = today.strftime("%y%m%d")
            clinic_code = clinic.code
            sequence = str(counter_obj.counter).zfill(cls.MIN_DIGITS)

            return f"{date_part}-{clinic_code}-{sequence}"