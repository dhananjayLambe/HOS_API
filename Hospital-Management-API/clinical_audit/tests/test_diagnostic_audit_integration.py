"""Integration tests for diagnostic and report audit workflows."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinical_audit.enums import AuditAction
from clinical_audit.models import ClinicalAudit
from diagnostics_engine.audit.diagnostic_audit_service import DiagnosticAuditService
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.services.reports import ArtifactUploadService, ReportWorkflowService
from diagnostics_engine.models import DiagnosticCategory, DiagnosticServiceMaster
from labs.tests.support.workflow_factories import (
    lab_admin_client,
    lab_mode_assignment,
    visit_ready_for_report_queue,
)
from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus
from notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator import (
    run_prepare_and_enqueue,
)
from notifications.services.delivery.whatsapp_service import WhatsAppService
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _lab_org_and_branch,
    _pricing,
)
from notifications.tests.test_diagnostic_recommendation_whatsapp import _available_result
from shared.logging.context import LogContext, get_context_manager

User = get_user_model()


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


class DiagnosticOrderAuditIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org, cls.branch = _lab_org_and_branch()
        from diagnostics_engine.models import DiagnosticCategory, DiagnosticPackage, DiagnosticPackageItem, DiagnosticServiceMaster

        cls.cat = DiagnosticCategory.objects.create(
            name="DAI Cat", code=f"DAI-{uuid.uuid4().hex[:6]}"
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"dai_svc_{uuid.uuid4().hex[:6]}",
            name="DAI Test",
            category=cls.cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_dai_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="DAI Pkg",
            category=cls.cat,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )
        _pricing(cls.branch, cls.svc, cls.pkg)

    def setUp(self) -> None:
        self.doctor_user, self.doc = _doctor_user_and_profile(
            __import__("clinic.models", fromlist=["Clinic"]).Clinic.objects.create(
                name=f"Clinic {uuid.uuid4().hex[:6]}"
            )
        )
        self.consultation, self.encounter, _, _, _, self.clinic = (
            _consultation_with_investigations(self.doctor_user, self.doc, svc=self.svc)
        )
        self.correlation_id = str(uuid.uuid4())
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-dai-order")
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_order_creation_emits_test_ordered(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            result = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=self.consultation,
                branch=self.branch,
                created_by=self.doctor_user,
            )
        self.assertFalse(result.idempotent)
        audits = ClinicalAudit.objects.filter(action=AuditAction.TEST_ORDERED)
        self.assertEqual(audits.count(), 1)
        self.assertEqual(audits.first().resource_id, str(result.order.id))
        self.assertEqual(audits.first().correlation_id, self.correlation_id)
        self.assertGreaterEqual(audits.first().new_value["payload"]["test_count"], 1)

    def test_idempotent_order_does_not_emit_test_ordered(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=self.consultation,
                branch=self.branch,
                created_by=self.doctor_user,
            )
        with self.captureOnCommitCallbacks(execute=True):
            second = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=self.consultation,
                branch=self.branch,
                created_by=self.doctor_user,
            )
        self.assertTrue(second.idempotent)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.TEST_ORDERED).count(),
            1,
        )

    def test_order_audit_failure_does_not_block_creation(self) -> None:
        with patch(
            "diagnostics_engine.audit.diagnostic_audit_service.ClinicalAuditService.record",
            return_value=type(
                "R",
                (),
                {"success": False, "error": "boom", "correlation_id": self.correlation_id},
            )(),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                result = DiagnosticOrderCreationService.create_order_from_consultation(
                    consultation=self.consultation,
                    branch=self.branch,
                    created_by=self.doctor_user,
                )
        self.assertIsNotNone(result.order)

    def test_test_ordered_payload_home_collection(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            result = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=self.consultation,
                branch=self.branch,
                created_by=self.doctor_user,
            )
        result.order.sample_collection_mode = "home"
        result.order.save(update_fields=["sample_collection_mode"])
        audit = ClinicalAudit.objects.get(action=AuditAction.TEST_ORDERED)
        self.assertIn("order_source", audit.new_value["payload"])


class RecommendationSentAuditIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from diagnostics_engine.models import DiagnosticPackage, DiagnosticPackageItem
        from diagnostics_engine.tests.test_lab_recommendation_service import (
            _clinic_with_pincode,
            _lab_org_branch_area,
        )

        cls.clinic = _clinic_with_pincode()
        cls.user, cls.doc = _doctor_user_and_profile(cls.clinic)
        cls.cat = DiagnosticCategory.objects.create(
            name=f"Rec DAI {uuid.uuid4().hex[:6]}",
            code=f"REC-DAI-{uuid.uuid4().hex[:6]}",
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"rec_dai_{uuid.uuid4().hex[:6]}",
            name="CBS",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.org, cls.branch = _lab_org_branch_area()
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_rec_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="CBS Pkg",
            category=cls.cat,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )
        _pricing(cls.branch, cls.svc, cls.pkg)

    def setUp(self) -> None:
        from django.contrib.auth.models import Group
        from patient_account.models import PatientAccount, PatientProfile

        g, _ = Group.objects.get_or_create(name="doctor")
        self.doc.user.groups.add(g)
        self.patient_user = User.objects.create_user(
            username="919876543210",
            password="testpass123",
        )
        self.patient_account = PatientAccount.objects.create(user=self.patient_user)
        self.patient_account.clinics.add(self.clinic)
        self.patient_profile = PatientProfile.objects.create(
            account=self.patient_account,
            first_name="Dhananjay",
            last_name="lambe",
            relation="self",
            gender="male",
            age_years=30,
        )
        self.consultation, self.encounter, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            svc=self.svc,
        )
        from consultations_core.models.encounter import ClinicalEncounter

        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(
            clinic=self.clinic,
            patient_profile=self.patient_profile,
            patient_account=self.patient_account,
        )
        self.encounter.refresh_from_db()
        self.correlation_id = str(uuid.uuid4())
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-dai-rec")
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    @override_settings(
        WHATSAPP_USE_SIMULATED_PROVIDER=True,
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED=True,
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME="diagnostic_test_recommendation_v3",
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS=(
            "patient_name,test_names,mrp,quoted_price,savings"
        ),
    )
    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_recommendation_sent_emits_audit(self, mock_recommend) -> None:
        mock_recommend.return_value = _available_result(
            self.consultation.id, self.branch, self.org
        )
        with self.captureOnCommitCallbacks(execute=True):
            message_id = run_prepare_and_enqueue(consultation_id=str(self.consultation.id))
        self.assertIsNotNone(message_id)
        with self.captureOnCommitCallbacks(execute=True):
            sent = WhatsAppService().send_recommendation_message(message_id=message_id)
        self.assertEqual(sent.status, WhatsAppMessageStatus.SENT)
        audits = ClinicalAudit.objects.filter(action=AuditAction.RECOMMENDATION_SENT)
        self.assertEqual(audits.count(), 1)
        self.assertGreaterEqual(audits.first().new_value["payload"]["test_count"], 0)

    @override_settings(
        WHATSAPP_USE_SIMULATED_PROVIDER=True,
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED=True,
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME="diagnostic_test_recommendation_v3",
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS=(
            "patient_name,test_names,mrp,quoted_price,savings"
        ),
    )
    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_recommendation_sent_idempotent(self, mock_recommend) -> None:
        mock_recommend.return_value = _available_result(
            self.consultation.id, self.branch, self.org
        )
        message_id = run_prepare_and_enqueue(consultation_id=str(self.consultation.id))
        self.assertIsNotNone(message_id)
        message = WhatsAppMessage.objects.get(pk=message_id)
        payload = message.request_payload or {}
        rec_id = payload.get("recommendation_id")
        with self.captureOnCommitCallbacks(execute=True):
            WhatsAppService().send_recommendation_message(message_id=message_id)
        encounter = self.consultation.encounter
        second = DiagnosticAuditService.emit_test_recommendation_sent(
            encounter,
            self.consultation,
            self.user,
            recommendation_id=rec_id,
        )
        self.assertIsNone(second)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.RECOMMENDATION_SENT).count(),
            1,
        )


class ReportAuditIntegrationTests(TestCase):
    def setUp(self) -> None:
        self.client, self.lab_user, self.branch, self.org = lab_admin_client()
        self.assignment, self.order = lab_mode_assignment(self.branch)
        visit_ready_for_report_queue(self.client, self.assignment)
        self.line = self.order.test_lines.first()
        self.report = DiagnosticTestReport.objects.create(
            order_test_line=self.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        self.correlation_id = str(uuid.uuid4())
        self.client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-dai-report")
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_upload_emits_report_uploaded(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            ArtifactUploadService.upload_report_artifacts(
                report=self.report,
                uploaded_files=[_pdf(b"audit-upload")],
                uploaded_by=self.lab_user.user,
                primary_file_index=0,
            )
        audits = ClinicalAudit.objects.filter(action=AuditAction.REPORT_UPLOADED)
        self.assertEqual(audits.count(), 1)
        self.assertEqual(audits.first().resource_id, str(self.report.id))

    def test_upload_idempotent_clinical_audit(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            ArtifactUploadService.upload_report_artifacts(
                report=self.report,
                uploaded_files=[_pdf(b"first")],
                uploaded_by=self.lab_user.user,
                primary_file_index=0,
            )
        encounter = self.order.encounter
        consultation = self.order.consultation
        second = DiagnosticAuditService.emit_report_uploaded(
            encounter,
            consultation,
            self.lab_user.user,
            report=self.report,
        )
        self.assertIsNone(second)

    def test_detail_view_emits_report_viewed(self) -> None:
        ArtifactUploadService.upload_report_artifacts(
            report=self.report,
            uploaded_files=[_pdf(b"view")],
            primary_file_index=0,
        )
        url = reverse("v1-report-detail", kwargs={"report_id": self.report.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        audits = ClinicalAudit.objects.filter(action=AuditAction.REPORT_VIEWED)
        self.assertEqual(audits.count(), 1)

    def test_unauthorized_detail_does_not_emit_viewed(self) -> None:
        _other_client, _other_lu, other_br, _ = lab_admin_client(branch_name="Other DAI")
        _assignment2, order2 = lab_mode_assignment(other_br)
        line2 = order2.test_lines.first()
        report2 = DiagnosticTestReport.objects.create(
            order_test_line=line2,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        url = reverse("v1-report-detail", kwargs={"report_id": report2.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            ClinicalAudit.objects.filter(
                action=AuditAction.REPORT_VIEWED,
                resource_id=str(report2.id),
            ).count(),
            0,
        )

    def test_download_emits_report_downloaded(self) -> None:
        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        self.client.post(url, {"files": [_pdf(b"dl")]}, format="multipart")
        self.report.refresh_from_db()
        ReportWorkflowService.mark_ready(self.report, user=self.lab_user.user)
        dl = reverse("v1-report-download", kwargs={"report_id": self.report.id})
        res = self.client.get(dl)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        audits = ClinicalAudit.objects.filter(action=AuditAction.REPORT_DOWNLOADED)
        self.assertGreaterEqual(audits.count(), 1)

    def test_download_emits_per_request(self) -> None:
        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        self.client.post(url, {"files": [_pdf(b"dl2")]}, format="multipart")
        self.report.refresh_from_db()
        ReportWorkflowService.mark_ready(self.report, user=self.lab_user.user)
        dl = reverse("v1-report-download", kwargs={"report_id": self.report.id})
        self.client.get(dl)
        self.client.get(dl)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.REPORT_DOWNLOADED).count(),
            2,
        )

    @override_settings(REPORT_DELIVERY_ASYNC=False)
    def test_send_whatsapp_emits_report_shared(self) -> None:
        ArtifactUploadService.upload_report_artifacts(
            report=self.report,
            uploaded_files=[_pdf(b"share")],
            uploaded_by=self.lab_user.user,
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(self.report, user=self.lab_user.user)
        url = reverse("v1-report-send-whatsapp", kwargs={"report_id": self.report.id})
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                url,
                {"recipient_phone": "9876543210", "channel": "WHATSAPP"},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        audits = ClinicalAudit.objects.filter(action=AuditAction.REPORT_SHARED)
        self.assertEqual(audits.count(), 1)

    def test_report_audit_records_encounter_and_consultation(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            ArtifactUploadService.upload_report_artifacts(
                report=self.report,
                uploaded_files=[_pdf(b"ctx")],
                uploaded_by=self.lab_user.user,
                primary_file_index=0,
            )
        audit = ClinicalAudit.objects.get(action=AuditAction.REPORT_UPLOADED)
        self.assertEqual(audit.encounter_id, str(self.order.encounter_id))
        self.assertEqual(audit.consultation_id, str(self.order.consultation_id))

    def test_audit_failure_does_not_block_upload(self) -> None:
        with patch(
            "diagnostics_engine.audit.diagnostic_audit_service.ClinicalAuditService.record",
            return_value=type(
                "R",
                (),
                {"success": False, "error": "boom", "correlation_id": self.correlation_id},
            )(),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                created = ArtifactUploadService.upload_report_artifacts(
                    report=self.report,
                    uploaded_files=[_pdf(b"fail-open")],
                    uploaded_by=self.lab_user.user,
                    primary_file_index=0,
                )
        self.assertEqual(len(created), 1)

    def test_hook_schedule_failure_is_fail_open(self) -> None:
        with patch(
            "diagnostics_engine.audit.hooks.emit_after_commit",
            side_effect=RuntimeError("schedule failed"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                created = ArtifactUploadService.upload_report_artifacts(
                    report=self.report,
                    uploaded_files=[_pdf(b"hook-fail")],
                    uploaded_by=self.lab_user.user,
                    primary_file_index=0,
                )
        self.assertEqual(len(created), 1)
