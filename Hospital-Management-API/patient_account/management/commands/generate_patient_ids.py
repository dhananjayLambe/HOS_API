from django.core.management.base import BaseCommand
from django.db import transaction
from patient_account.models import PatientProfile
from account.services.business_id_service import BusinessIDService


class Command(BaseCommand):
    help = "Generate Business IDs for existing patient profiles"
    def handle(self, *args, **kwargs):
        profiles = PatientProfile.objects.filter(public_id__isnull=True)
        if not profiles.exists():
            self.stdout.write(self.style.SUCCESS("All patients already have IDs."))
            return
        count = 0

        with transaction.atomic():
            for profile in profiles:
                profile.public_id = BusinessIDService.generate_id("PAT", 6)
                profile.save(update_fields=["public_id"])
                count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully generated IDs for {count} patients.")
        )