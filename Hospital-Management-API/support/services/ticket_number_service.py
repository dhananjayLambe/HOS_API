from django.db import transaction
from django.utils import timezone
from support.models.sequence import SupportTicketSequence


def generate_support_ticket_number():
    """
    Generates ticket number like:
    DP-SUP-202601-000001
    """
    now = timezone.now()
    year = now.year
    month = now.month

    with transaction.atomic():
        seq, created = SupportTicketSequence.objects.select_for_update().get_or_create(
            year=year,
            month=month,
            defaults={"last_number": 0}
        )

        seq.last_number += 1
        seq.save()

        ticket_number = f"DP-SUP-{year}{month:02d}-{seq.last_number:06d}"
        return ticket_number