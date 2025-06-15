from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from patient_account.models import PatientProfile
from patient_account.tasks import invalidate_patient_search_cache

@receiver([post_save, post_delete], sender=PatientProfile)
def clear_patient_cache(sender, instance, **kwargs):
    invalidate_patient_search_cache.delay(instance.first_name)