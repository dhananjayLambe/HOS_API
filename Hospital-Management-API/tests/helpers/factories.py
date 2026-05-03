"""Plain-Python test factories (no factory_boy)."""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from helpdesk.models import HelpdeskClinicUser
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def uniq_reg() -> str:
    return f"REG-{uuid.uuid4().hex[:12]}"


def make_clinic(name: str | None = None) -> Clinic:
    return Clinic.objects.create(
        name=name or f"Clinic {uuid.uuid4().hex[:6]}",
        registration_number=uniq_reg(),
    )


def make_doctor(clinic: Clinic | None = None, **kwargs) -> DoctorModel:
    doc_user = User.objects.create_user(
        username=f"doc_{uuid.uuid4().hex[:10]}",
        password="pass12345",
        first_name=kwargs.pop("first_name", "Doc"),
        last_name=kwargs.pop("last_name", "Test"),
    )
    doc = DoctorModel.objects.create(
        user=doc_user,
        primary_specialization=kwargs.pop("primary_specialization", "general"),
        is_approved=kwargs.pop("is_approved", True),
        **kwargs,
    )
    if clinic is not None:
        doc.clinics.add(clinic)
    return doc


def make_helpdesk_user(clinic: Clinic) -> User:
    g, _ = Group.objects.get_or_create(name="helpdesk")
    u = User.objects.create_user(
        username=f"hd_{uuid.uuid4().hex[:10]}",
        password="pass12345",
        first_name="Help",
        last_name="Desk",
    )
    u.groups.add(g)
    HelpdeskClinicUser.objects.create(user=u, clinic=clinic, is_active=True)
    return u


def make_patient(clinic: Clinic, **profile_kwargs) -> tuple[User, PatientAccount, PatientProfile]:
    g_pat, _ = Group.objects.get_or_create(name="patient")
    pat_user = User.objects.create_user(
        username=f"pat_{uuid.uuid4().hex[:10]}",
        password="pass12345",
        first_name=profile_kwargs.pop("first_name", "Pat"),
        last_name=profile_kwargs.pop("last_name", "Client"),
    )
    pat_user.groups.add(g_pat)
    account = PatientAccount.objects.create(user=pat_user)
    account.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=account,
        first_name=profile_kwargs.pop("first_name", "Pat"),
        last_name=profile_kwargs.pop("last_name", "Client"),
        relation=profile_kwargs.pop("relation", "self"),
        gender=profile_kwargs.pop("gender", "male"),
        age_years=profile_kwargs.pop("age_years", 30),
        **profile_kwargs,
    )
    return pat_user, account, profile


def make_authenticated_client(user: User) -> APIClient:
    c = APIClient()
    c.force_authenticate(user=user)
    return c
