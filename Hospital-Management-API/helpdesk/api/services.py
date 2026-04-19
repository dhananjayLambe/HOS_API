from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404

from account.models import User
from clinic.models import Clinic
from doctor.models import doctor
from helpdesk.models import HelpdeskClinicUser
from helpdesk.api.constants import MAX_HELPDESK_PER_CLINIC


def get_doctor(user):
    return get_object_or_404(doctor, user=user)


def validate_clinic_access(doctor_obj, clinic):
    if clinic not in doctor_obj.clinics.all():
        raise ValidationError("You do not have access to this clinic")


def _try_reclaim_stale_helpdesk_username(mobile: str) -> None:
    """
    If this mobile is still taken by a legacy *soft-deleted* helpdesk row (User exists,
    HelpdeskClinicUser exists with is_active=False), hard-delete the User so the number
    can be re-added. Does nothing if the user is a doctor, patient, clinic admin, etc.
    """
    existing = User.objects.filter(username=mobile).first()
    if not existing:
        return

    if doctor.objects.filter(user=existing).exists():
        return

    from patient_account.models import PatientAccount

    if PatientAccount.objects.filter(user=existing).exists():
        return

    from patient.models import patient as PatientModel

    if PatientModel.objects.filter(user=existing).exists():
        return

    from clinic.models import ClinicAdminProfile

    if ClinicAdminProfile.objects.filter(user=existing).exists():
        return

    hc = HelpdeskClinicUser.objects.filter(user=existing).first()
    if hc is None:
        return

    if hc.is_active:
        return

    # Legacy soft-delete: inactive helpdesk profile only — remove User (CASCADE removes HC + logs)
    try:
        existing.delete()
    except ProtectedError as exc:
        raise ValidationError(
            "This mobile number is already registered and linked to other records."
        ) from exc


@transaction.atomic
def create_helpdesk_user(user, clinic_id, first_name, last_name, mobile):
    """
    Create User with username=mobile, explicit first_name/last_name, synthetic email.
    Custom User.status is True (enabled) for active helpdesk accounts; is_active=True.
    """
    doctor_obj = get_doctor(user)
    clinic = get_object_or_404(Clinic, id=clinic_id)

    validate_clinic_access(doctor_obj, clinic)

    count = HelpdeskClinicUser.objects.filter(
        clinic=clinic,
        is_active=True
    ).count()

    if count >= MAX_HELPDESK_PER_CLINIC:
        raise ValidationError("Maximum staff limit reached for this clinic")

    _try_reclaim_stale_helpdesk_username(mobile)

    if User.objects.filter(username=mobile).exists():
        raise ValidationError("This mobile number is already registered")

    fn = (first_name or "").strip()
    ln = (last_name or "").strip()
    if not fn or not ln:
        raise ValidationError("First name and last name are required")

    try:
        new_user = User.objects.create(
            username=mobile,
            first_name=fn,
            last_name=ln,
            email=f"{mobile}@helpdesk.local",
            status=True,
            is_active=True,
        )
    except IntegrityError:
        raise ValidationError("This mobile number is already registered")

    group, _ = Group.objects.get_or_create(name="helpdesk")
    new_user.groups.add(group)

    HelpdeskClinicUser.objects.create(
        user=new_user,
        clinic=clinic,
        is_active=True
    )

    return new_user


def list_helpdesk_users(user, clinic_id):
    doctor_obj = get_doctor(user)
    clinic = get_object_or_404(Clinic, id=clinic_id)

    validate_clinic_access(doctor_obj, clinic)

    return HelpdeskClinicUser.objects.filter(
        clinic=clinic,
        is_active=True
    ).select_related("user")


@transaction.atomic
def remove_helpdesk_user(user, helpdesk_id):
    """
    Hard-delete the helpdesk user account so the mobile (username) can be re-used.
    Deletes HelpdeskClinicUser (and related activity logs) via CASCADE when User is deleted.
    """
    doctor_obj = get_doctor(user)

    helpdesk = get_object_or_404(HelpdeskClinicUser, id=helpdesk_id)

    validate_clinic_access(doctor_obj, helpdesk.clinic)

    helpdesk_user = helpdesk.user
    helpdesk_user.delete()

    return True
