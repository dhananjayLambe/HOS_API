"""Tests for GET /api/v1/diagnostics/reports/doctor-summary/."""

from __future__ import annotations

from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from diagnostics_engine.api.services.doctor_report_counts import count_pending_doctor_reports
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.services.reports import ArtifactUploadService, ReportWorkflowService
from diagnostics_engine.tests.test_order_creation_service import _create_catalog_service
from doctor.tests.test_reports_dashboard import _pdf
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.patient import PatientProfileFactory
from tests.factories.user import UserFactory

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from diagnostics_engine.models import (
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderTestLine,
)
from diagnostics_engine.models.choices import OrderLineType, OrderTestLineStatus


class DoctorReportDashboardSummaryTests(APITestCase):
    def setUp(self):
        self.url = reverse("v1-doctor-report-dashboard-summary")
        self.clinic = ClinicFactory()

        self.doctor_user = UserFactory(username="91000003001")
        ensure_doctor_group(self.doctor_user)
        self.doctor = DoctorFactory(user=self.doctor_user, clinics=(self.clinic,))

        self.other_doctor_user = UserFactory(username="91000003002")
        ensure_doctor_group(self.other_doctor_user)
        self.other_doctor = DoctorFactory(user=self.other_doctor_user, clinics=(self.clinic,))

        self.helpdesk_user = UserFactory(username="91000003003")
        helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user.groups.add(helpdesk_group)

    def _create_ready_report_for_doctor(self, *, doctor):
        service = _create_catalog_service(name="Summary CBC")
        profile = PatientProfileFactory(first_name="Summary", last_name="Patient")
        encounter = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="created",
            is_active=True,
        )
        consultation = Consultation.objects.create(encounter=encounter)
        order = DiagnosticOrder.objects.create(
            order_number="ORD-SUMMARY-1",
            encounter=encounter,
            consultation=consultation,
            patient_profile=profile,
            doctor=doctor,
        )
        order_item = DiagnosticOrderItem.objects.create(
            order=order,
            line_type=OrderLineType.TEST,
            service=service,
            name_snapshot=service.name,
            price_snapshot=100,
        )
        line = DiagnosticOrderTestLine.objects.create(
            order=order,
            order_item=order_item,
            service=service,
            status=OrderTestLineStatus.PENDING,
        )
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"summary-report")],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report, user=doctor.user)
        return report

    def test_clinic_id_required(self):
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_jwt_ignores_doctor_id_query_param(self):
        self._create_ready_report_for_doctor(doctor=self.doctor)
        self._create_ready_report_for_doctor(doctor=self.other_doctor)

        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(
            self.url,
            {
                "clinic_id": str(self.clinic.id),
                "doctor_id": str(self.other_doctor.id),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["pending_review"], 1)

    def test_non_doctor_requires_doctor_id(self):
        self.client.force_authenticate(user=self.helpdesk_user)
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_helpdesk_uses_provided_doctor_id(self):
        self._create_ready_report_for_doctor(doctor=self.other_doctor)

        self.client.force_authenticate(user=self.helpdesk_user)
        response = self.client.get(
            self.url,
            {
                "clinic_id": str(self.clinic.id),
                "doctor_id": str(self.other_doctor.id),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["pending_review"], 1)

    def test_count_matches_shared_pending_counter(self):
        self._create_ready_report_for_doctor(doctor=self.doctor)

        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id)},
        )
        expected = count_pending_doctor_reports(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
        )
        self.assertEqual(response.data["data"]["pending_review"], expected)
        self.assertEqual(expected, 1)
