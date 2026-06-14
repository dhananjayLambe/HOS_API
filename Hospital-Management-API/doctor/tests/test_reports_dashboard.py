"""Integration tests for GET /api/v1/doctors/dashboard/reports/."""

from __future__ import annotations

import uuid
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from diagnostics_engine.api.services.doctor_report_counts import count_pending_doctor_reports
from diagnostics_engine.models import (
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderTestLine,
)
from diagnostics_engine.models.choices import OrderLineType, OrderTestLineStatus, ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.services.reports import ArtifactUploadService, ReportWorkflowService
from diagnostics_engine.tests.test_order_creation_service import _create_catalog_service
from doctor.api.services.dashboard_report_queries import PENDING_UPLOAD_GRACE_MINUTES
from doctor.api.services.reports_dashboard_service import build_doctor_reports_dashboard
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.patient import PatientProfileFactory
from tests.factories.user import UserFactory


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


class DoctorReportsDashboardIntegrationTests(APITestCase):
    def setUp(self):
        self.url = reverse("doctor_dashboard:dashboard-reports")
        self.clinic = ClinicFactory()
        self.clinic_b = ClinicFactory()

        self.doctor_user = UserFactory(username="91000002001")
        ensure_doctor_group(self.doctor_user)
        self.doctor = DoctorFactory(user=self.doctor_user, clinics=(self.clinic,))

        self.helpdesk_user = UserFactory(username="91000002003")
        helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user.groups.add(helpdesk_group)

    def _auth_doctor(self):
        self.client.force_authenticate(user=self.doctor_user)

    def _create_order_line(
        self,
        *,
        doctor=None,
        clinic=None,
        service_name: str = "CBC Report",
        line_status: str = OrderTestLineStatus.PENDING,
    ):
        doctor = doctor or self.doctor
        clinic = clinic or self.clinic
        service = _create_catalog_service(name=service_name)
        profile = PatientProfileFactory(first_name="Report", last_name="Patient")
        encounter = ClinicalEncounter.objects.create(
            clinic=clinic,
            doctor=doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="created",
            is_active=True,
        )
        consultation = Consultation.objects.create(encounter=encounter)
        consultation.is_finalized = True
        consultation.ended_at = timezone.now()
        consultation.save()
        encounter.refresh_from_db()
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            status="consultation_completed",
            is_active=False,
        )
        encounter.refresh_from_db()

        order = DiagnosticOrder.objects.create(
            order_number=f"ORD-{uuid.uuid4().hex[:6].upper()}",
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
            status=line_status,
        )
        return order, line, profile, encounter

    def _create_ready_report(
        self,
        *,
        service_name: str = "CBC Report",
        reviewed_at=None,
        doctor=None,
        clinic=None,
    ):
        order, line, profile, encounter = self._create_order_line(
            service_name=service_name,
            doctor=doctor,
            clinic=clinic,
        )
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"ready-report")],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report, user=self.doctor_user)
        if reviewed_at is not None:
            DiagnosticTestReport.objects.filter(pk=report.pk).update(reviewed_at=reviewed_at)
            report.refresh_from_db()
        return report, profile, encounter

    def test_non_doctor_forbidden(self):
        self.client.force_authenticate(user=self.helpdesk_user)
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_clinic_id_required(self):
        self._auth_doctor()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ready_for_review_matches_pending_count(self):
        self._create_ready_report(service_name="CBC Report")
        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        expected = count_pending_doctor_reports(doctor_id=self.doctor.id, clinic_id=self.clinic.id)
        self.assertEqual(data["insights"]["ready_for_review"], expected)
        self.assertEqual(expected, 1)

    def test_delivered_unreviewed_report_counts_as_pending(self):
        report, profile, encounter = self._create_ready_report(service_name="Delivered CBC")
        DiagnosticTestReport.objects.filter(pk=report.pk).update(
            status=ReportLifecycleStatus.DELIVERED,
            reviewed_at=None,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["insights"]["ready_for_review"], 1)
        self.assertEqual(len(data["reports"]["results"]), 1)
        row = data["reports"]["results"][0]
        self.assertEqual(row["review_status"], "READY_FOR_REVIEW")
        self.assertEqual(row["patient_id"], str(profile.id))

    def test_work_queue_includes_ready_and_pending_upload_only(self):
        self._create_ready_report(service_name="CBC Report")
        reviewed_report, _, _ = self._create_ready_report(service_name="Lipid Profile")
        DiagnosticTestReport.objects.filter(pk=reviewed_report.pk).update(
            reviewed_at=timezone.now() - timedelta(hours=1)
        )

        _, pending_line, _, _ = self._create_order_line(
            service_name="Thyroid Profile",
            line_status=OrderTestLineStatus.COMPLETED,
        )
        DiagnosticOrderTestLine.objects.filter(pk=pending_line.pk).update(
            updated_at=timezone.now() - timedelta(minutes=PENDING_UPLOAD_GRACE_MINUTES + 5)
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        rows = response.data["data"]["reports"]["results"]
        statuses = {row["review_status"] for row in rows}
        self.assertIn("READY_FOR_REVIEW", statuses)
        self.assertIn("PENDING_UPLOAD", statuses)
        self.assertNotIn("REVIEWED", statuses)

    def test_reviewed_report_appears_in_activity_not_table(self):
        report, profile, _ = self._create_ready_report(service_name="Thyroid Profile")
        reviewed_at = timezone.now() - timedelta(hours=2)
        DiagnosticTestReport.objects.filter(pk=report.pk).update(reviewed_at=reviewed_at)

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        data = response.data["data"]
        table_statuses = [row["review_status"] for row in data["reports"]["results"]]
        self.assertNotIn("REVIEWED", table_statuses)

        reviewed_events = [
            e for e in data["recent_activity"] if e["event_type"] == "REPORT_REVIEWED"
        ]
        self.assertTrue(any(e["patient_name"] == profile.get_full_name() for e in reviewed_events))

    def test_pending_upload_grace_excludes_recent_completion(self):
        _, line, _, _ = self._create_order_line(
            service_name="Chest X-Ray",
            line_status=OrderTestLineStatus.COMPLETED,
        )
        DiagnosticOrderTestLine.objects.filter(pk=line.pk).update(
            updated_at=timezone.now() - timedelta(minutes=5)
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        data = response.data["data"]
        self.assertEqual(data["insights"]["pending_upload"], 0)
        self.assertEqual(data["reports"]["count"], 0)

    def test_pending_upload_included_after_grace_period(self):
        _, line, profile, encounter = self._create_order_line(
            service_name="Chest X-Ray",
            line_status=OrderTestLineStatus.COMPLETED,
        )
        DiagnosticOrderTestLine.objects.filter(pk=line.pk).update(
            updated_at=timezone.now() - timedelta(minutes=PENDING_UPLOAD_GRACE_MINUTES + 10)
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        row = response.data["data"]["reports"]["results"][0]
        self.assertEqual(row["review_status"], "PENDING_UPLOAD")
        self.assertEqual(row["patient_name"], profile.get_full_name())
        self.assertEqual(row["encounter_id"], str(encounter.id))
        self.assertEqual(row["priority"], "NORMAL")
        self.assertIsNone(row["report_id"])

        pending_events = [
            e
            for e in response.data["data"]["recent_activity"]
            if e["event_type"] == "REPORT_PENDING_UPLOAD"
        ]
        self.assertEqual(len(pending_events), 1)

    def test_reviewed_today_uses_local_date(self):
        report, _, _ = self._create_ready_report()
        DiagnosticTestReport.objects.filter(pk=report.pk).update(reviewed_at=timezone.now())

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.data["data"]["insights"]["reviewed_today"], 1)

    def test_reports_received_today_uses_artifact_upload_date(self):
        report, _, _ = self._create_ready_report()
        artifact = report.artifacts.filter(is_primary=True).first()
        yesterday = timezone.now() - timedelta(days=1)
        DiagnosticTestReport.objects.filter(pk=report.pk).update(created_at=yesterday)
        DiagnosticReportArtifact.objects.filter(pk=artifact.pk).update(uploaded_at=timezone.now())

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.data["data"]["insights"]["reports_received_today"], 1)

    def test_row_payload_includes_encounter_and_reserved_fields(self):
        report, profile, encounter = self._create_ready_report(service_name="HbA1c")
        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        row = response.data["data"]["reports"]["results"][0]
        self.assertEqual(row["report_id"], str(report.id))
        self.assertEqual(row["patient_id"], str(profile.id))
        self.assertEqual(row["encounter_id"], str(encounter.id))
        self.assertIsNotNone(row["visit_date"])
        self.assertEqual(row["priority"], "NORMAL")
        self.assertFalse(row["is_critical"])
        self.assertFalse(row["doctor_acknowledged"])
        self.assertFalse(row["whatsapp_sent"])

    def test_clinic_scoping_excludes_other_clinic(self):
        other_doctor_user = UserFactory(username="91000002002")
        ensure_doctor_group(other_doctor_user)
        other_doctor = DoctorFactory(user=other_doctor_user, clinics=(self.clinic_b,))

        self._create_ready_report(service_name="Clinic A Report")
        self._create_ready_report(
            service_name="Clinic B Report",
            doctor=other_doctor,
            clinic=self.clinic_b,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        types = [row["report_type"] for row in response.data["data"]["reports"]["results"]]
        self.assertIn("Clinic A Report", types)
        self.assertNotIn("Clinic B Report", types)

    @patch("doctor.api.services.reports_dashboard_service.cache")
    def test_cache_hit_skips_rebuild(self, mock_cache):
        cached_payload = {
            "insights": {
                "ready_for_review": 0,
                "reviewed_today": 0,
                "pending_upload": 0,
                "reports_received_today": 0,
            },
            "reports": {"count": 0, "results": []},
            "recent_activity": [],
        }
        mock_cache.get.return_value = cached_payload

        result = build_doctor_reports_dashboard(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            page=1,
            page_size=10,
        )
        self.assertEqual(result, cached_payload)
        mock_cache.get.assert_called_once()

    def test_in_progress_unreviewed_with_artifact_counts_as_pending(self):
        report, profile, _ = self._create_ready_report(service_name="In Progress CBC")
        DiagnosticTestReport.objects.filter(pk=report.pk).update(
            status=ReportLifecycleStatus.IN_PROGRESS,
            reviewed_at=None,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["insights"]["ready_for_review"], 1)
        self.assertEqual(len(data["reports"]["results"]), 1)
        self.assertEqual(data["reports"]["results"][0]["review_status"], "READY_FOR_REVIEW")
        self.assertEqual(data["reports"]["results"][0]["patient_id"], str(profile.id))

    def test_in_progress_without_artifact_excluded(self):
        order, line, _, _ = self._create_order_line(service_name="No Artifact CBC")
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.IN_PROGRESS,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        data = response.data["data"]
        self.assertEqual(data["insights"]["ready_for_review"], 0)
        self.assertEqual(data["reports"]["count"], 0)
        self.assertFalse(report.artifacts.exists())

    def test_pagination_page_and_page_size(self):
        for index in range(6):
            self._create_ready_report(service_name=f"Ready Report {index}")

        for index in range(6):
            _, line, _, _ = self._create_order_line(
                service_name=f"Pending Upload {index}",
                line_status=OrderTestLineStatus.COMPLETED,
            )
            DiagnosticOrderTestLine.objects.filter(pk=line.pk).update(
                updated_at=timezone.now() - timedelta(minutes=PENDING_UPLOAD_GRACE_MINUTES + 5 + index)
            )

        self._auth_doctor()
        page_one = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id), "page": 1, "page_size": 5},
        )
        page_two = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id), "page": 2, "page_size": 5},
        )

        self.assertEqual(page_one.status_code, status.HTTP_200_OK)
        self.assertEqual(page_two.status_code, status.HTTP_200_OK)
        self.assertEqual(page_one.data["data"]["reports"]["count"], 12)
        self.assertEqual(len(page_one.data["data"]["reports"]["results"]), 5)
        self.assertEqual(len(page_two.data["data"]["reports"]["results"]), 5)

        page_one_statuses = [
            row["review_status"] for row in page_one.data["data"]["reports"]["results"]
        ]
        self.assertTrue(all(status_name == "PENDING_UPLOAD" for status_name in page_one_statuses))

    def test_order_doctor_scope_when_encounter_doctor_differs(self):
        other_doctor_user = UserFactory(username="91000002004")
        ensure_doctor_group(other_doctor_user)
        other_doctor = DoctorFactory(user=other_doctor_user, clinics=(self.clinic,))

        service = _create_catalog_service(name="Order Doctor Scope")
        profile = PatientProfileFactory(first_name="Scope", last_name="Patient")
        encounter = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=other_doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="created",
            is_active=True,
        )
        consultation = Consultation.objects.create(encounter=encounter)
        consultation.is_finalized = True
        consultation.ended_at = timezone.now()
        consultation.save()
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            status="consultation_completed",
            is_active=False,
        )

        order = DiagnosticOrder.objects.create(
            order_number=f"ORD-{uuid.uuid4().hex[:6].upper()}",
            encounter=encounter,
            consultation=consultation,
            patient_profile=profile,
            doctor=self.doctor,
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
            uploaded_files=[_pdf(b"order-doctor-scope")],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report, user=self.doctor_user)

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        types = [row["report_type"] for row in response.data["data"]["reports"]["results"]]
        self.assertIn("Order Doctor Scope", types)

    def test_report_uploaded_activity_event(self):
        self._create_ready_report(service_name="Uploaded Activity CBC")

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        uploaded_events = [
            e
            for e in response.data["data"]["recent_activity"]
            if e["event_type"] == "REPORT_UPLOADED"
        ]
        self.assertEqual(len(uploaded_events), 1)
        self.assertEqual(uploaded_events[0]["report_name"], "Uploaded Activity CBC")

    def test_excluded_encounter_statuses(self):
        for encounter_status in ("cancelled", "no_show"):
            with self.subTest(encounter_status=encounter_status):
                service = _create_catalog_service(name=f"Excluded {encounter_status}")
                profile = PatientProfileFactory(first_name="Excluded", last_name="Patient")
                encounter = ClinicalEncounter.objects.create(
                    clinic=self.clinic,
                    doctor=self.doctor,
                    patient_account=profile.account,
                    patient_profile=profile,
                    status=encounter_status,
                    is_active=False,
                )
                consultation = Consultation.objects.create(encounter=encounter)
                order = DiagnosticOrder.objects.create(
                    order_number=f"ORD-{uuid.uuid4().hex[:6].upper()}",
                    encounter=encounter,
                    consultation=consultation,
                    patient_profile=profile,
                    doctor=self.doctor,
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
                    uploaded_files=[_pdf(b"excluded")],
                    primary_file_index=0,
                )
                ReportWorkflowService.mark_ready(report, user=self.doctor_user)

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.data["data"]["insights"]["ready_for_review"], 0)
        self.assertEqual(response.data["data"]["reports"]["count"], 0)

    def test_activity_limit_caps_at_ten(self):
        for index in range(12):
            self._create_ready_report(service_name=f"Activity Report {index}")

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertLessEqual(len(response.data["data"]["recent_activity"]), 10)
