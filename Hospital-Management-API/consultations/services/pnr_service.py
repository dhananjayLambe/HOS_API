from django.db import transaction
from django.utils import timezone
from consultations.models import EncounterDailyCounter


class PNRService:
    """
    Generates production-grade, ops-friendly PNRs.
    Format: YYMMDD-XXXX
    Counter starts from 1000 every day.
    """

    START_COUNTER = 1000

    @classmethod
    def generate_pnr(cls):
        today = timezone.now().date()

        with transaction.atomic():
            counter_obj, created = (
                EncounterDailyCounter.objects
                .select_for_update()
                .get_or_create(
                    date=today,
                    defaults={"counter": cls.START_COUNTER}
                )
            )

            counter_obj.counter += 1
            counter_obj.save(update_fields=["counter"])

            date_part = today.strftime("%y%m%d")
            return f"{date_part}-{counter_obj.counter}"