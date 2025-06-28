from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.timezone import localdate
from django.core.cache import cache
from appointments.models import Appointment

@receiver(post_save, sender=Appointment)
def update_metrics_cache(sender, instance, **kwargs):
    today = localdate()
    if instance.appointment_date != today:
        return

    key = f"doctor_metrics:{instance.doctor.id}:{instance.clinic.id}:{today}"
    qs = Appointment.objects.filter(
        doctor=instance.doctor,
        clinic=instance.clinic,
        appointment_date=today
    )

    metrics = {
        "scheduled": qs.filter(status="scheduled").count(),
        "completed": qs.filter(status="completed").count(),
        "cancelled": qs.filter(status="cancelled").count(),
        "no_show": qs.filter(status="no_show").count(),
    }

    cache.set(key, metrics, timeout=300)  # Cache for 5 minutes