
from appointments.models import AppointmentHistory
# ----------------------------
# HOOK (to call inside cancel/reschedule/create APIs)
# ----------------------------

def log_appointment_history(appointment, status, changed_by=None, comment=""):
    AppointmentHistory.objects.create(
        appointment=appointment,
        status=status,
        changed_by=changed_by,
        comment=comment
    )