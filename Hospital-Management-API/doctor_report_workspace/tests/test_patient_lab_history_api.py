"""Patient Lab History API tests — clinic scope + KPI formula."""

from __future__ import annotations

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from diagnostics_engine.models.choices import OrderTestLineStatus
from doctor_report_workspace.services.patient_lab_history import PatientLabHistoryService
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    mark_line_pending_upload,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class PatientLabHistoryApiTests(APITestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def _auth(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_summary_counts_pending_and_ready(self):
        line = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            service_name="CBC",
            line_status=OrderTestLineStatus.COMPLETED,
        )
        # create_order_line returns tuple
        if isinstance(line, tuple):
            line = line[0]
        patient_id = str(line.order.patient_profile_id)
        create_ready_report(line=line)

        awaiting = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            service_name="LFT",
            line_status=OrderTestLineStatus.COMPLETED,
        )
        if isinstance(awaiting, tuple):
            awaiting_line, awaiting_order, *_ = awaiting
        else:
            awaiting_line = awaiting
            awaiting_order = awaiting.order
        awaiting_order.patient_profile = line.order.patient_profile
        awaiting_order.save(update_fields=["patient_profile"])
        mark_line_pending_upload(line=awaiting_line)

        url = reverse(
            "doctor_report_workspace:patient-lab-history-summary",
            kwargs={"patient_id": patient_id},
        )
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data["data"]
        self.assertGreaterEqual(data["total_reports"], 1)
        self.assertGreaterEqual(data["pending"], 1)
        self.assertIsNotNone(data["latest_lab"])

    def test_list_includes_version_and_source_fields(self):
        line = create_order_line(doctor=self.doctor, clinic=self.clinic)
        if isinstance(line, tuple):
            line = line[0]
        create_ready_report(line=line)
        patient_id = str(line.order.patient_profile_id)

        url = reverse(
            "doctor_report_workspace:patient-lab-history-list",
            kwargs={"patient_id": patient_id},
        )
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data["data"]["items"]
        self.assertTrue(len(items) >= 1)
        item = items[0]
        self.assertIn("version", item)
        self.assertIn("is_latest", item)
        self.assertIn("source", item)
        self.assertIn("lifecycle_state", item)
        self.assertEqual(item["lifecycle_state"], "ACTIVE")

    def test_other_clinic_doctor_sees_empty(self):
        line = create_order_line(doctor=self.doctor, clinic=self.clinic)
        if isinstance(line, tuple):
            line = line[0]
        create_ready_report(line=line)
        patient_id = str(line.order.patient_profile_id)

        other_clinic = ClinicFactory()
        other_user = UserFactory(username=f"91{timezone.now().timestamp():.0f}"[-10:].rjust(10, "9"))
        ensure_doctor_group(other_user)
        other_doc = DoctorFactory(user=other_user, clinics=(other_clinic,))
        # Same doctor membership pattern — other doctor at other clinic
        self._auth(other_user)

        url = reverse(
            "doctor_report_workspace:patient-lab-history-summary",
            kwargs={"patient_id": patient_id},
        )
        res = self.client.get(url, {"clinic_id": str(other_clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["data"]["total_reports"], 0)

    def test_service_timeline_events(self):
        line = create_order_line(doctor=self.doctor, clinic=self.clinic)
        if isinstance(line, tuple):
            line = line[0]
        create_ready_report(line=line)
        patient_id = str(line.order.patient_profile_id)
        events = PatientLabHistoryService().timeline_events(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            patient_id=patient_id,
        )
        self.assertTrue(any(e.kind == "lab_report" for e in events))
