from django.core.management.base import BaseCommand
from django.db import transaction
from helpdesk.models import HelpdeskClinicUser
from account.services.business_id_service import BusinessIDService


class Command(BaseCommand):
    help = "Generate Business IDs for existing helpdesk users"

    def handle(self, *args, **kwargs):
        users = HelpdeskClinicUser.objects.filter(public_id__isnull=True)

        if not users.exists():
            self.stdout.write(self.style.SUCCESS("All helpdesk users already have IDs."))
            return

        count = 0

        with transaction.atomic():
            for user in users:
                user.public_id = BusinessIDService.generate_id("EMP", 4)
                user.save(update_fields=["public_id"])
                count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully generated IDs for {count} helpdesk users.")
        )