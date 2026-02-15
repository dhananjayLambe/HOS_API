from django.db import transaction
from django.utils import timezone
from consultations.models import EncounterDailyCounter


class PNRService:
    """
    Legacy PNR generator. Prefer VisitPNRService for encounter visit PNRs.
    Requires clinic; counter is per-clinic per day.
    """

    START_COUNTER = 1000

    @classmethod
    def generate_pnr(cls, clinic):
        """Requires clinic. Use VisitPNRService.generate_pnr(clinic) for visit PNRs."""
        if not clinic or not getattr(clinic, "code", None):
            raise ValueError("Valid clinic with code is required.")
        today = timezone.now().date()
        with transaction.atomic():
            counter_obj, _ = (
                EncounterDailyCounter.objects
                .select_for_update()
                .get_or_create(
                    clinic=clinic,
                    date=today,
                    defaults={"counter": cls.START_COUNTER},
                )
            )
            counter_obj.counter += 1
            counter_obj.save(update_fields=["counter"])
            date_part = today.strftime("%y%m%d")
            return f"{date_part}-{counter_obj.counter}"