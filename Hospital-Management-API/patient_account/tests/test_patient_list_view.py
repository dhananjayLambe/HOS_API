"""
DB-backed integration tests for GET /api/patients/list/ (PatientListView + list_patients_for_workspace).
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import (
    Prescription,
    PrescriptionCancellationSource,
    PrescriptionStatus,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.helpdesk import ensure_helpdesk_group
from tests.factories.patient import PatientProfileFactory
from tests.factories.user import UserFactory


User = get_user_model()


class PatientListViewIntegrationTests(APITestCase):
    """Integration tests with real DB objects (no mocks)."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.url = reverse("patient_account:patient-list")
        self.helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.doctor_group, _ = Group.objects.get_or_create(name="doctor")
        self.patient_group, _ = Group.objects.get_or_create(name="patient")

        self.clinic = ClinicFactory()
        self.clinic_b = ClinicFactory()

        self.helpdesk_user = User.objects.create_user(username="91000000001")
        self.helpdesk_user.groups.add(self.helpdesk_group)

        self.doctor_user = UserFactory(username="91000000002")
        ensure_doctor_group(self.doctor_user)
        self.doctor = DoctorFactory(user=self.doctor_user, clinics=(self.clinic,))

        self.doctor2_user = UserFactory(username="91000000003")
        ensure_doctor_group(self.doctor2_user)
        self.doctor2 = DoctorFactory(user=self.doctor2_user, clinics=(self.clinic,))

    def _auth_helpdesk(self):
        self.client.force_authenticate(user=self.helpdesk_user)

    def _auth_doctor(self, user=None):
        self.client.force_authenticate(user=user or self.doctor_user)

    def _closed_visit(self, profile, doctor, clinic, created_at=None):
        """Completed encounter (no longer active)."""
        enc = ClinicalEncounter.objects.create(
            clinic=clinic,
            doctor=doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="consultation_completed",
            is_active=False,
        )
        if created_at is not None:
            ClinicalEncounter.objects.filter(pk=enc.pk).update(created_at=created_at)
            enc.refresh_from_db()
        return enc

    def _start_consultation_flow(self, profile, doctor, clinic):
        """Encounter in consultation_in_progress with an unfinished Consultation row."""
        enc = ClinicalEncounter.objects.create(
            clinic=clinic,
            doctor=doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="created",
            is_active=True,
        )
        Consultation.objects.create(encounter=enc)
        enc.refresh_from_db()
        return enc

    def _finalize_consultation(self, consultation):
        consultation.is_finalized = True
        consultation.ended_at = timezone.now()
        consultation.save()

    def test_default_q_empty_returns_recent_list_for_helpdesk(self):
        p1 = PatientProfileFactory(first_name="A", last_name="One")
        p2 = PatientProfileFactory(first_name="B", last_name="Two")
        p3 = PatientProfileFactory(first_name="C", last_name="Three")
        for p in (p1, p2, p3):
            p.account.clinics.add(self.clinic)
        base = timezone.now() - timedelta(days=10)
        self._closed_visit(p1, self.doctor, self.clinic, created_at=base + timedelta(days=1))
        self._closed_visit(p2, self.doctor, self.clinic, created_at=base + timedelta(days=2))
        self._closed_visit(p3, self.doctor, self.clinic, created_at=base + timedelta(days=3))

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "", "filter": "recent", "page": 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 3)
        ids = [row["patient_id"] for row in response.data["results"]]
        # Most recent last_visit first → p3, p2, p1
        self.assertEqual(ids[0], str(p3.id))

    def test_helpdesk_sees_all_clinic_patients(self):
        profiles = []
        for i in range(3):
            p = PatientProfileFactory(first_name=f"H{i}", last_name="Helpdesk")
            p.account.clinics.add(self.clinic)
            profiles.append(p)
            self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 3)

    def test_doctor_scoped_to_own_encounters_only(self):
        pa = PatientProfileFactory(first_name="Alice", last_name="Alpha")
        pb = PatientProfileFactory(first_name="Bob", last_name="Beta")
        pc = PatientProfileFactory(first_name="Carol", last_name="Gamma")
        for p in (pa, pb, pc):
            p.account.clinics.add(self.clinic)

        self._closed_visit(pa, self.doctor, self.clinic)
        self._closed_visit(pb, self.doctor2, self.clinic)
        # pc: no encounters

        self._auth_doctor(self.doctor_user)
        response = self.client.get(self.url, {"filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["patient_id"], str(pa.id))

    def test_doctor_with_no_encounters_sees_empty_list(self):
        fresh_doc_user = UserFactory(username="91000000004")
        ensure_doctor_group(fresh_doc_user)
        DoctorFactory(user=fresh_doc_user, clinics=(self.clinic,))
        p = PatientProfileFactory(first_name="Lonely", last_name="Patient")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_doctor(fresh_doc_user)
        response = self.client.get(self.url, {"filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(response.data["results"], [])

    def test_search_by_name(self):
        p_match = PatientProfileFactory(first_name="John", last_name="Smith")
        p_other = PatientProfileFactory(first_name="Jane", last_name="Doe")
        for p in (p_match, p_other):
            p.account.clinics.add(self.clinic)
            self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "Smith", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["last_name"], "Smith")

    def test_search_by_mobile_digits(self):
        p = PatientProfileFactory(first_name="Mobile", last_name="SearchUser")
        User.objects.filter(pk=p.account.user_id).update(username="9198765004321")
        p.account.refresh_from_db()
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "987650", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)

    def test_search_by_uhid(self):
        p = PatientProfileFactory(first_name="UHID", last_name="Patient")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)
        p.refresh_from_db()
        self.assertTrue(p.public_id)

        self._auth_helpdesk()
        token = p.public_id[-6:]
        response = self.client.get(self.url, {"q": token, "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)

    def test_search_by_visit_pnr(self):
        p = PatientProfileFactory(first_name="PNR", last_name="Patient")
        p.account.clinics.add(self.clinic)
        enc = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="consultation_completed",
            is_active=False,
        )
        digits = "".join(ch for ch in enc.visit_pnr if ch.isdigit())
        self.assertTrue(digits)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": digits[:5], "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)

    def test_filter_today_returns_only_today_encounters(self):
        p_today = PatientProfileFactory(first_name="Today", last_name="One")
        p_old = PatientProfileFactory(first_name="Old", last_name="Two")
        for p in (p_today, p_old):
            p.account.clinics.add(self.clinic)

        self._closed_visit(p_old, self.doctor, self.clinic, created_at=timezone.now() - timedelta(days=5))

        enc_today = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_today.account,
            patient_profile=p_today,
            status="consultation_completed",
            is_active=False,
        )
        ClinicalEncounter.objects.filter(pk=enc_today.pk).update(created_at=timezone.now())

        self._auth_helpdesk()
        response = self.client.get(self.url, {"filter": "today"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["patient_id"], str(p_today.id))

    def test_filter_follow_up_due_returns_only_overdue_consultations(self):
        p_due = PatientProfileFactory(first_name="Follow", last_name="Due")
        p_ok = PatientProfileFactory(first_name="Follow", last_name="Ok")
        for p in (p_due, p_ok):
            p.account.clinics.add(self.clinic)

        enc_due = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_due.account,
            patient_profile=p_due,
            status="created",
            is_active=True,
        )
        c_due = Consultation.objects.create(encounter=enc_due, follow_up_date=date.today() - timedelta(days=2))
        self._finalize_consultation(c_due)

        enc_ok = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_ok.account,
            patient_profile=p_ok,
            status="created",
            is_active=True,
        )
        c_ok = Consultation.objects.create(encounter=enc_ok, follow_up_date=date.today() + timedelta(days=30))
        self._finalize_consultation(c_ok)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"filter": "follow_up_due"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["patient_id"], str(p_due.id))

    def test_filter_has_active_rx_returns_only_with_finalized_active_rx(self):
        p_rx = PatientProfileFactory(first_name="Rx", last_name="Yes")
        p_none = PatientProfileFactory(first_name="Rx", last_name="No")
        for p in (p_rx, p_none):
            p.account.clinics.add(self.clinic)

        enc_rx = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_rx.account,
            patient_profile=p_rx,
            status="created",
            is_active=True,
        )
        cons_rx = Consultation.objects.create(encounter=enc_rx)
        # Prescriptions must be created while encounter is in consultation_in_progress
        Prescription.objects.create(
            consultation=cons_rx,
            status=PrescriptionStatus.FINALIZED,
            finalized_at=timezone.now(),
            is_active=True,
        )
        self._finalize_consultation(cons_rx)

        enc_none = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_none.account,
            patient_profile=p_none,
            status="created",
            is_active=True,
        )
        cons_none = Consultation.objects.create(encounter=enc_none)
        Prescription.objects.create(
            consultation=cons_none,
            status=PrescriptionStatus.DRAFT,
            is_active=True,
        )

        self._auth_helpdesk()
        response = self.client.get(self.url, {"filter": "has_active_rx"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["patient_id"], str(p_rx.id))

    def test_pagination_first_and_last_page(self):
        profiles = []
        now = timezone.now()
        for i in range(25):
            p = PatientProfileFactory(first_name=f"P{i}", last_name="Page")
            p.account.clinics.add(self.clinic)
            profiles.append(p)
            self._closed_visit(p, self.doctor, self.clinic, created_at=now - timedelta(minutes=i))

        self._auth_helpdesk()
        r1 = self.client.get(self.url, {"filter": "recent", "page": 1, "page_size": 10})
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data["total"], 25)
        self.assertEqual(r1.data["page"], 1)
        self.assertEqual(r1.data["page_size"], 10)
        self.assertEqual(len(r1.data["results"]), 10)
        self.assertEqual(r1.data["total_pages"], 3)

        r3 = self.client.get(self.url, {"filter": "recent", "page": 3, "page_size": 10})
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r3.data["results"]), 5)

    def test_active_prescriptions_count_excludes_cancelled_and_draft(self):
        """Draft RX does not count; finalized active counts; cancelled does not."""
        p_draft = PatientProfileFactory(first_name="Rx", last_name="DraftOnly")
        p_final = PatientProfileFactory(first_name="Rx", last_name="FinalOnly")
        p_cancel = PatientProfileFactory(first_name="Rx", last_name="Cancelled")
        for p in (p_draft, p_final, p_cancel):
            p.account.clinics.add(self.clinic)

        enc_d = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_draft.account,
            patient_profile=p_draft,
            status="created",
            is_active=True,
        )
        cons_d = Consultation.objects.create(encounter=enc_d)
        Prescription.objects.create(consultation=cons_d, status=PrescriptionStatus.DRAFT, is_active=True)

        enc_f = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_final.account,
            patient_profile=p_final,
            status="created",
            is_active=True,
        )
        cons_f = Consultation.objects.create(encounter=enc_f)
        Prescription.objects.create(
            consultation=cons_f,
            status=PrescriptionStatus.FINALIZED,
            finalized_at=timezone.now(),
            is_active=True,
        )
        self._finalize_consultation(cons_f)

        enc_c = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p_cancel.account,
            patient_profile=p_cancel,
            status="created",
            is_active=True,
        )
        cons_c = Consultation.objects.create(encounter=enc_c)
        rx_live = Prescription.objects.create(
            consultation=cons_c,
            status=PrescriptionStatus.FINALIZED,
            finalized_at=timezone.now(),
            is_active=True,
        )
        self._finalize_consultation(cons_c)
        rx_live.cancel(
            source=PrescriptionCancellationSource.DOCTOR,
            reason_code="test_cancel",
            actor_user=self.doctor_user,
        )

        self._auth_helpdesk()
        r = self.client.get(self.url, {"filter": "recent"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        by_last = {row["last_name"]: row["active_prescriptions_count"] for row in r.data["results"]}
        self.assertEqual(by_last["DraftOnly"], 0)
        self.assertEqual(by_last["FinalOnly"], 1)
        self.assertEqual(by_last["Cancelled"], 0)

    def test_recent_diagnosis_returns_latest_finalized_consultation_diagnosis(self):
        p = PatientProfileFactory(first_name="Dx", last_name="Patient")
        p.account.clinics.add(self.clinic)

        enc_old = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )
        c_old = Consultation.objects.create(encounter=enc_old)
        self._finalize_consultation(c_old)
        dx_old = CustomDiagnosis.objects.create(name="Older Problem", consultation=c_old)
        CustomDiagnosis.objects.filter(pk=dx_old.pk).update(created_at=timezone.now() - timedelta(hours=10))

        enc_new = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )
        c_new = Consultation.objects.create(encounter=enc_new)
        self._finalize_consultation(c_new)
        CustomDiagnosis.objects.create(name="Latest Problem", consultation=c_new)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "Dx", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["recent_diagnosis"], "Latest Problem")

    def test_open_encounter_state_consultation_active_takes_priority(self):
        """
        Queue encounter at clinic A + consultation-active encounter at clinic B for same patient:
        open_encounter_state must be consultation_active.
        """
        p = PatientProfileFactory(first_name="Dual", last_name="State")
        p.account.clinics.add(self.clinic, self.clinic_b)

        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )
        self._start_consultation_flow(p, self.doctor, self.clinic_b)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "Dual", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data["results"][0]
        self.assertTrue(row["has_open_encounter"])
        self.assertEqual(row["open_encounter_state"], "consultation_active")

    def test_open_encounter_state_in_queue_when_only_queue_encounter(self):
        p = PatientProfileFactory(first_name="Queue", last_name="Only")
        p.account.clinics.add(self.clinic)
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "Queue", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data["results"][0]
        self.assertEqual(row["open_encounter_state"], "in_queue")

    def test_open_encounter_state_null_when_no_open_encounters(self):
        p = PatientProfileFactory(first_name="Closed", last_name="Only")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "Closed", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data["results"][0]
        self.assertFalse(row["has_open_encounter"])
        self.assertIsNone(row["open_encounter_state"])

    def test_has_unfinished_consultation_true_when_consultation_not_finalized(self):
        p = PatientProfileFactory(first_name="Unfin", last_name="Consult")
        p.account.clinics.add(self.clinic)
        self._start_consultation_flow(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "Unfin", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["results"][0]["has_unfinished_consultation"])

    def test_is_follow_up_due_true_when_followup_date_lte_today(self):
        p = PatientProfileFactory(first_name="FU", last_name="Due")
        p.account.clinics.add(self.clinic)
        enc = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )
        Consultation.objects.create(encounter=enc, follow_up_date=date.today())

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "FU", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["results"][0]["is_follow_up_due"])

    def test_response_shape_contains_all_required_fields(self):
        p = PatientProfileFactory(first_name="Shape", last_name="Test")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        keys = {
            "patient_id",
            "patient_account_id",
            "uhid",
            "full_name",
            "first_name",
            "last_name",
            "age_display",
            "gender",
            "mobile",
            "last_visit_at",
            "recent_diagnosis",
            "active_prescriptions_count",
            "visits_count",
            "has_open_encounter",
            "open_encounter_state",
            "has_unfinished_consultation",
            "is_follow_up_due",
        }
        self.assertEqual(keys, set(response.data["results"][0].keys()))

    def test_visits_count_excludes_cancelled_and_no_show(self):
        p = PatientProfileFactory(first_name="Visit", last_name="Count")
        p.account.clinics.add(self.clinic)

        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="cancelled",
            is_active=False,
        )
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        response = self.client.get(self.url, {"q": "Visit", "filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["visits_count"], 1)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_role_returns_403(self):
        pu = User.objects.create_user(username="91000000999")
        pu.groups.add(self.patient_group)
        self.client.force_authenticate(user=pu)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PatientListViewEmptyDbTests(APITestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.url = reverse("patient_account:patient-list")
        self.helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user = User.objects.create_user(username="92000000001")
        self.helpdesk_user.groups.add(self.helpdesk_group)
        self.client.force_authenticate(user=self.helpdesk_user)

    def test_empty_database_returns_zero_total(self):
        response = self.client.get(self.url, {"filter": "recent"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(response.data["total_pages"], 0)
