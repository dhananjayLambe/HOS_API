from django.db import models
from django.utils import timezone
import uuid
import os
from diagnostic.models import LabCommissionLedger, TestBooking
from decimal import Decimal

# def report_upload_path(instance, filename):
#     account_id = str(instance.patient_profile.account.id)
#     profile_id = str(instance.patient_profile.id)
#     consultation_id = str(instance.consultation.id)
#     test_pnr = instance.test_pnr or instance.booking.recommendation.test_pnr
#     now = timezone.now()
#     year = now.strftime('%Y')
#     month = now.strftime('%m')
#     timestamp = now.strftime('%Y%m%d_%H%M')

#     ext = os.path.splitext(filename)[1]  # includes dot, e.g. '.pdf'
#     new_filename = f"{test_pnr}_{timestamp}{ext.lower()}"

#     return f"lab_reports/{account_id}/{profile_id}/reports/{year}/{month}/{consultation_id}/{new_filename}"

def create_commission_ledger_entry(booking: TestBooking):
    if not booking.lab or not booking.test_price or not booking.recommendation:
        return  # Incomplete data

    lab = booking.lab
    mapping = booking.lab_mapping

    test = booking.recommendation.test
    test_price = booking.test_price or Decimal("0.00")

    # Get commission percentages
    platform_percent = getattr(mapping, "platform_commission_percent", None) or lab.commission_percent or 0
    doctor_percent = getattr(mapping, "doctor_commission_percent", None) or lab.doctor_commission_percent or 0

    platform_amt = (test_price * Decimal(platform_percent)) / 100
    doctor_amt = (test_price * Decimal(doctor_percent)) / 100
    lab_earning = test_price - platform_amt - doctor_amt

    LabCommissionLedger.objects.create(
        booking=booking,
        lab=lab,
        test=test,
        test_price=test_price,
        platform_commission_amount=platform_amt,
        doctor_commission_amount=doctor_amt,
        lab_net_earning=lab_earning,
        generated_from="auto",
        is_active=True
    )