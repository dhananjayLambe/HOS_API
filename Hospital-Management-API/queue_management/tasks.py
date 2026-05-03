from celery import shared_task


@shared_task
def sync_queue_realtime_task(*, doctor_id: str, clinic_id: str, queue_date_iso: str):
    from datetime import date

    from queue_management.services.queue_sync import _sync_queue_realtime

    queue_date = date.fromisoformat(queue_date_iso)
    _sync_queue_realtime(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        queue_date=queue_date,
    )
