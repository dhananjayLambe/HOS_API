import os
from django.db.models.signals import pre_save
from django.dispatch import receiver
from doctor.models import doctor

@receiver(pre_save, sender=doctor)
def delete_old_profile_photo(sender, instance, **kwargs):
    if not instance.pk:
        return  # New object, no old photo

    try:
        old_instance = doctor.objects.get(pk=instance.pk)
    except doctor.DoesNotExist:
        return

    old_photo = old_instance.photo
    new_photo = instance.photo

    if old_photo and old_photo != new_photo:
        if old_photo.path and os.path.isfile(old_photo.path):
            try:
                os.remove(old_photo.path)
            except Exception as e:
                print(f"Could not delete old photo: {e}")