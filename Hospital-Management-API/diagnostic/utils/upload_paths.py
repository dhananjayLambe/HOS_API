from django.utils import timezone
import os

def report_upload_path(instance, filename):
    account_id = str(instance.patient_profile.account.id)
    profile_id = str(instance.patient_profile.id)
    consultation_id = str(instance.consultation.id)
    test_pnr = instance.test_pnr or instance.booking.recommendation.test_pnr
    now = timezone.now()
    year = now.strftime('%Y')
    month = now.strftime('%m')
    timestamp = now.strftime('%Y%m%d_%H%M')

    ext = os.path.splitext(filename)[1]  # includes dot, e.g. '.pdf'
    new_filename = f"{test_pnr}_{timestamp}{ext.lower()}"

    return f"lab_reports/{account_id}/{profile_id}/reports/{year}/{month}/{consultation_id}/{new_filename}"
