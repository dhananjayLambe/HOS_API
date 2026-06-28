"""Consultation access checks for Marketplace Recommendation API."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from consultations_core.models.consultation import Consultation
    from django.http import HttpRequest


def _helpdesk_has_clinic_access(user, clinic) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if not user.groups.filter(name="helpdesk").exists():
        return False
    hp = getattr(user, "helpdesk_profile", None)
    if hp is None or clinic is None:
        return False
    return hp.clinic_id == clinic.id


def _clinic_admin_has_access(user, clinic) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if not user.groups.filter(name="clinic_admin").exists():
        return False
    cap = getattr(user, "clinic_admin_profile", None)
    if cap is None or clinic is None:
        return False
    return cap.clinic_id == clinic.id


def resolve_consultation_access(request: HttpRequest, consultation: Consultation) -> bool:
    """
    Return True when the authenticated user may request a recommendation for this consultation.

    Patients are denied in M3 (future channel service accounts in M4+).
    """
    user = request.user
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True

    encounter = consultation.encounter
    clinic = encounter.clinic if encounter else None

    if user.groups.filter(name__in=["helpdesk_admin"]).exists():
        return True

    if _helpdesk_has_clinic_access(user, clinic):
        return True

    if _clinic_admin_has_access(user, clinic):
        return True

    if user.groups.filter(name="doctor").exists():
        doctor_user_id = getattr(getattr(encounter, "doctor", None), "user_id", None)
        return bool(doctor_user_id and doctor_user_id == user.id)

    return False
