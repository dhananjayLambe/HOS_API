from django.core.management.base import BaseCommand

from labs.services.workflow_transitions import reject_stale_pending_assignments


class Command(BaseCommand):
    help = "Reject stale PENDING lab order assignments past the SLA window."

    def handle(self, *args, **options):
        count = reject_stale_pending_assignments()
        self.stdout.write(
            self.style.SUCCESS(f"Auto-rejected {count} stale pending assignment(s)."),
        )
