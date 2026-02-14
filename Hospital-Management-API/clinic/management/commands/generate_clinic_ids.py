from django.core.management.base import BaseCommand
from django.db import transaction
from clinic.models import Clinic
from account.services.business_id_service import BusinessIDService


class Command(BaseCommand):
    help = "Generate Business IDs for existing clinics"

    def handle(self, *args, **kwargs):
        clinics = Clinic.objects.filter(code__isnull=True)

        if not clinics.exists():
            self.stdout.write(self.style.SUCCESS("All clinics already have IDs."))
            return

        count = 0

        with transaction.atomic():
            for clinic in clinics:
                clinic.code = BusinessIDService.generate_id("CL", 5)
                clinic.save(update_fields=["code"])
                count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully generated IDs for {count} clinics.")
        )