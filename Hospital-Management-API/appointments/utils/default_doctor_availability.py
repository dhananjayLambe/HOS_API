"""Bootstrap DoctorAvailability when missing or empty (OPD booking UX)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Tuple

from django.db import IntegrityError

if TYPE_CHECKING:
    from clinic.models import Clinic
    from doctor.models import DoctorAvailability, doctor


def default_weekly_availability_json() -> list:
    """
    Sensible OPD template: Mon–Sat 09:00–18:00, Sun off.
    Matches WorkingHoursDaySerializer (nested morning windows).
    """
    working = []
    for day in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday"):
        working.append(
            {
                "day": day,
                "is_working": True,
                "morning": {"start": "09:00", "end": "18:00"},
                "breaks": [],
            }
        )
    working.append({"day": "sunday", "is_working": False, "breaks": []})
    return working


def ensure_doctor_availability(doctor: "doctor", clinic: "Clinic") -> Tuple["DoctorAvailability", bool]:
    """
    Return (DoctorAvailability, bootstrapped) where bootstrapped is True if we created
    the row or filled an empty availability JSON in this call.
    """
    from doctor.models import DoctorAvailability

    defaults = {
        "availability": default_weekly_availability_json(),
        "slot_duration": 15,
        "buffer_time": 5,
        "max_appointments_per_day": 40,
        "emergency_slots": 2,
    }

    bootstrapped = False
    try:
        obj, created = DoctorAvailability.objects.get_or_create(
            doctor=doctor,
            clinic=clinic,
            defaults=defaults,
        )
    except IntegrityError:
        obj = DoctorAvailability.objects.get(doctor=doctor, clinic=clinic)
        created = False

    if created:
        bootstrapped = True
    else:
        days = obj.availability
        if not isinstance(days, list) or len(days) == 0:
            obj.availability = default_weekly_availability_json()
            if not obj.slot_duration or obj.slot_duration < 1:
                obj.slot_duration = 15
            obj.buffer_time = max(0, int(obj.buffer_time or 5))
            obj.save(update_fields=["availability", "slot_duration", "buffer_time", "updated_at"])
            bootstrapped = True

    return obj, bootstrapped
