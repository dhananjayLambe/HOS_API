import uuid

import pytest
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from medicines.models.drug import DrugMaster
from medicines.models.masters import FormulationMaster
from medicines.models.choices import DrugType
from tests.helpers.medicine_masters import ensure_autofill_route_and_dose_masters
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.helpdesk import HelpdeskClinicUserFactory, ensure_helpdesk_group
from tests.factories.patient import PatientAccountFactory, PatientProfileFactory, ensure_patient_group


@pytest.fixture(autouse=True)
def _disable_celery_eager(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True


@pytest.fixture(autouse=True)
def _locmem_cache(settings):
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def clinic(db):
    return ClinicFactory()


@pytest.fixture
def doctor(db, clinic):
    doc = DoctorFactory()
    doc.clinics.add(clinic)
    ensure_doctor_group(doc.user)
    return doc


@pytest.fixture
def helpdesk_user(db, clinic):
    h = HelpdeskClinicUserFactory(clinic=clinic)
    ensure_helpdesk_group(h.user)
    return h.user


@pytest.fixture
def patient_account(db, clinic):
    acc = PatientAccountFactory()
    ensure_patient_group(acc.user)
    acc.clinics.add(clinic)
    return acc


@pytest.fixture
def patient_profile(db, patient_account):
    return PatientProfileFactory(account=patient_account)


@pytest.fixture
def formulation_master(db):
    return FormulationMaster.objects.create(name=f"tab-{uuid.uuid4().hex[:8]}")


@pytest.fixture
def drug_master(db, formulation_master):
    ensure_autofill_route_and_dose_masters()
    return DrugMaster.objects.create(
        code=f"RX-{uuid.uuid4().hex[:10]}",
        brand_name="Test Paracetamol",
        formulation=formulation_master,
        drug_type=DrugType.TABLET,
        is_active=True,
    )


@pytest.fixture
def authenticated_helpdesk_client(helpdesk_user):
    """Dedicated client so it is not overwritten by authenticated_doctor_client in the same test."""
    c = APIClient()
    c.force_authenticate(user=helpdesk_user)
    return c


@pytest.fixture
def authenticated_doctor_client(doctor):
    c = APIClient()
    c.force_authenticate(user=doctor.user)
    return c


@pytest.fixture
def real_auth_client():
    def _attach(user):
        c = APIClient()
        access = str(RefreshToken.for_user(user).access_token)
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        return c

    return _attach


@pytest.fixture
def real_doctor_client(doctor, real_auth_client):
    return real_auth_client(doctor.user)


@pytest.fixture
def encounter_for_jwt(db, clinic, doctor, patient_account, patient_profile):
    """Minimal encounter for JWT smoke (doctor must match encounter.doctor for some views)."""
    from consultations_core.services.encounter_service import EncounterService

    enc, _ = EncounterService.get_or_create_encounter(
        clinic=clinic,
        patient_account=patient_account,
        patient_profile=patient_profile,
        doctor=doctor,
        appointment=None,
        encounter_type="walk_in",
        entry_mode="helpdesk",
        created_by=doctor.user,
        consultation_type="FULL",
    )
    return enc
