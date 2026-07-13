"""Shared helpers for recommendation business audit tests."""

from __future__ import annotations

import uuid
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from consultations_core.models.consultation import Consultation
from consultations_core.services.encounter_service import EncounterService
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from shared.logging.context import LogContext, get_context_manager
from tests.factories.clinic import ClinicFactory

User = get_user_model()


def setup_recommendation_context(*, recommendation_id: str | None = None):
    recommendation_id = recommendation_id or str(uuid.uuid4())
    correlation_id = str(uuid.uuid4())
    get_context_manager().set(
        LogContext(
            correlation_id=correlation_id,
            workflow_instance_id=recommendation_id,
        )
    )
    encounter, consultation, user, clinic = encounter_bundle()
    return encounter, consultation, user, clinic, recommendation_id, correlation_id


def encounter_bundle():
    clinic = ClinicFactory()
    g, _ = Group.objects.get_or_create(name="doctor")
    doctor_user = User.objects.create_user(
        username=f"doc_ra_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    doctor_user.groups.add(g)
    doc_profile, _ = DoctorModel.objects.get_or_create(
        user=doctor_user,
        defaults={"primary_specialization": "General"},
    )
    doc_profile.clinics.add(clinic)
    patient_user = User.objects.create_user(
        username=f"pat_ra_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    account = PatientAccount.objects.create(user=patient_user)
    account.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=account,
        first_name="Pat",
        last_name="Test",
        relation="self",
        gender="male",
        age_years=30,
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=account,
        patient_profile=profile,
        doctor=doc_profile,
        created_by=doctor_user,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    return encounter, consultation, doctor_user, clinic


def sample_result(*, available: bool = True):
    test = SimpleNamespace(name="CBC", code="CBC")
    package = SimpleNamespace(name="Basic Panel", code="BP1")
    lab = SimpleNamespace(pk=uuid.uuid4())
    branch = SimpleNamespace(pk=uuid.uuid4())
    return SimpleNamespace(
        available=available,
        failure_reason=None if available else "NO_ELIGIBLE_LABORATORY",
        recommended_lab=lab if available else None,
        recommended_branch=branch if available else None,
        collection_mode="home",
        expanded_tests=[test] if available else [],
        packages=[package] if available else [],
        quoted_price="999.00" if available else None,
        duration_ms=42,
    )


def whatsapp_message_stub(*, recommendation_id: str, consultation_id: str, message_id=None):
    return SimpleNamespace(
        id=message_id or uuid.uuid4(),
        template_name="rec_template",
        meta_message_id="wamid.test123",
        status="QUEUED",
        request_payload={
            "recommendation_id": recommendation_id,
            "consultation_id": consultation_id,
            "variant": "available",
            "recommendation_metadata": {"expires_at": "2026-07-13T12:00:00+00:00"},
        },
        prescription=None,
        encounter_id=None,
        failure_reason="",
        error_code="",
    )
