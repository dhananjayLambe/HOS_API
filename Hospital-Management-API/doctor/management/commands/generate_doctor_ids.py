from django.core.management.base import BaseCommand
from django.db import transaction
from doctor.models import doctor
from account.services.business_id_service import BusinessIDService


class Command(BaseCommand):
    help = "Generate Business IDs for existing doctors"

    def handle(self, *args, **kwargs):
        doctors = doctor.objects.filter(public_id__isnull=True)

        if not doctors.exists():
            self.stdout.write(self.style.SUCCESS("All doctors already have IDs."))
            return

        count = 0

        with transaction.atomic():
            for doc in doctors:
                doc.public_id = BusinessIDService.generate_id("DOC", 4)
                doc.save(update_fields=["public_id"])
                count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully generated IDs for {count} doctors.")
        )