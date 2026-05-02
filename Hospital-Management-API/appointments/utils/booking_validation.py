"""Helpers for appointment booking validation and booking_source."""

from __future__ import annotations

HELPDESK_GROUPS = ("helpdesk", "helpdesk_admin")

# Default window for how far ahead bookings are allowed (overridden by settings.MAX_BOOKING_DAYS).
MAX_BOOKING_DAYS = 30


def booking_error(code: str, message: str) -> dict:
    return {"code": code, "message": message}


def err_slot_conflict() -> dict:
    return booking_error("SLOT_CONFLICT", "Slot already booked")


def err_past_time() -> dict:
    return booking_error("PAST_TIME", "Cannot book past appointment")


def err_future_limit_exceeded(max_days: int) -> dict:
    return booking_error(
        "FUTURE_LIMIT_EXCEEDED",
        f"Appointments can only be booked within {max_days} days",
    )


def err_future_limit_reschedule() -> dict:
    return booking_error(
        "FUTURE_LIMIT_EXCEEDED",
        "Appointments can only be rescheduled within allowed range",
    )


def err_invalid_status() -> dict:
    return booking_error(
        "INVALID_STATUS",
        "Only scheduled appointments can be rescheduled",
    )


def err_invalid_profile() -> dict:
    return booking_error("INVALID_PROFILE", "Patient profile does not belong to account")


def err_invalid_doctor_clinic() -> dict:
    return booking_error("INVALID_DOCTOR_CLINIC", "Doctor not associated with clinic")


def err_invalid_slot_range() -> dict:
    return booking_error("INVALID_SLOT_RANGE", "Slot start time must be before slot end time")


def err_doctor_on_leave() -> dict:
    return booking_error("DOCTOR_UNAVAILABLE", "Doctor is on leave for the selected date")


def err_wrong_patient_account() -> dict:
    return booking_error("ACCESS_DENIED", "You can only book for your own patient account")


def get_booking_source(user) -> str:
    if user.groups.filter(name__in=HELPDESK_GROUPS).exists():
        return "walk_in"
    return "online"
