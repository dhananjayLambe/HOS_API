# diagnostic/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from diagnostic.models import TestBooking, LabCommissionLedger
from diagnostic.create_commission_ledger_entry import create_commission_ledger_entry

@receiver(post_save, sender=TestBooking)
def create_ledger_on_booking_complete(sender, instance, created, **kwargs):
    if created:
        return  # only monitor updates

    if instance.status == "COMPLETED":
        # Ledger already exists?
        if LabCommissionLedger.objects.filter(booking=instance).exists():
            return

        create_commission_ledger_entry(instance)