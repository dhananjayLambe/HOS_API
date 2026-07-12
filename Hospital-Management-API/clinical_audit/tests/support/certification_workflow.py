"""Canonical end-to-end certification workflow for Clinical Audit."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Any
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinical_audit.certification.constants import (
    CERTIFICATION_EXPECTED_COUNT,
    CERTIFICATION_REQUIRED_ACTIONS,
)
from clinical_audit.enums import AuditAction
from clinical_audit.models import ClinicalAudit
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import (
    ConsultationInvestigations,
    InvestigationItem,
    InvestigationSource,
    InvestigationStatus,
    InvestigationUrgency,
)
from consultations_core.services.encounter_service import EncounterService
from consultations_core.services.preconsultation_service import PreConsultationService
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService
from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.services.reports import ArtifactUploadService, ReportWorkflowService
from diagnostics_engine.tests.test_lab_recommendation_service import (
    _clinic_with_pincode,
    _lab_org_branch_area,
)
from diagnostics_engine.tests.test_order_creation_service import (
    _doctor_user_and_profile,
    _pricing,
)
from medicines.models import DrugMaster, DrugType, FormulationMaster
from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator import (
    run_prepare_and_enqueue,
)
from notifications.services.delivery.whatsapp_service import WhatsAppService
from notifications.tests.test_diagnostic_recommendation_whatsapp import _available_result
from patient_account.models import PatientAccount, PatientProfile
from shared.logging.context import LogContext, get_context_manager
from tests.helpers.medicine_masters import ensure_autofill_route_and_dose_masters
from tests.helpers.payloads import end_consultation_payload

User = get_user_model()


@dataclass
class CertificationWorkflowResult:
    correlation_id: str
    consultation_id: str
    patient_account_id: str
    encounter_id: str
    order_id: str | None
    report_id: str | None
    audits: list[ClinicalAudit]


def _pdf(content: bytes = b"%PDF-1.4 certification") -> SimpleUploadedFile:
    return SimpleUploadedFile("certification_report.pdf", content, content_type="application/pdf")


def _doctor_client() -> tuple[APIClient, Any]:
    group, _ = Group.objects.get_or_create(name="doctor")
    user = User.objects.create_user(
        username=f"doc_cert_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    user.groups.add(group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


class CertificationWorkflowContext:
    """Builds and runs the canonical 13-event certification patient journey."""

    drug: DrugMaster
    svc: DiagnosticServiceMaster
    pkg: DiagnosticPackage
    org: Any
    branch: Any
    clinic: Any

    @classmethod
    def prepare_master_data(cls) -> None:
        ensure_autofill_route_and_dose_masters()
        form = FormulationMaster.objects.create(name=f"cert-form-{uuid.uuid4().hex[:6]}")
        cls.drug = DrugMaster.objects.create(
            code=f"CERT-DRUG-{uuid.uuid4().hex[:6]}",
            brand_name="Cert Paracetamol",
            formulation=form,
            drug_type=DrugType.TABLET,
            is_active=True,
        )
        cls.clinic = _clinic_with_pincode("400001")
        cls.cat = DiagnosticCategory.objects.create(
            name=f"Cert Cat {uuid.uuid4().hex[:6]}",
            code=f"CERT-{uuid.uuid4().hex[:6]}",
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"cert_svc_{uuid.uuid4().hex[:6]}",
            name="Cert CBC",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_cert_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Cert Package",
            category=cls.cat,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )
        cls.org, cls.branch = _lab_org_branch_area()
        _pricing(cls.branch, cls.svc, cls.pkg)

    def __init__(self, *, correlation_id: str | None = None) -> None:
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.client, self.doctor_user = _doctor_client()
        self.client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-cert-workflow")
        )

        self.user, self.doc = _doctor_user_and_profile(self.clinic)
        group, _ = Group.objects.get_or_create(name="doctor")
        self.user.groups.add(group)
        self.doctor_user = self.user
        self.client.force_authenticate(user=self.user)

        patient_user = User.objects.create_user(
            username="919876543210",
            password="testpass123",
        )
        self.patient_account = PatientAccount.objects.create(user=patient_user)
        self.patient_account.clinics.add(self.clinic)
        self.patient_profile = PatientProfile.objects.create(
            account=self.patient_account,
            first_name="Certification",
            last_name="Patient",
            relation="self",
            gender="male",
            age_years=35,
        )

        self.encounter = EncounterService.create_encounter(
            clinic=self.clinic,
            patient_account=self.patient_account,
            patient_profile=self.patient_profile,
            doctor=self.doc,
            created_by=self.user,
        )
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(
            status="pre_consultation_completed",
        )
        self.encounter.refresh_from_db()
        PreConsultationService.create_preconsultation(
            encounter=self.encounter,
            specialty_code="general",
            template_version="v1",
            entry_mode="doctor",
            created_by=self.user,
        )
        self.consultation: Consultation | None = None

        self.order_id: str | None = None
        self.report_id: str | None = None

    def _attach_investigations(self, consultation: Consultation) -> None:
        ci, _ = ConsultationInvestigations.objects.get_or_create(consultation=consultation)
        InvestigationItem.objects.create(
            investigations=ci,
            source=InvestigationSource.CATALOG,
            catalog_item=self.svc,
            name=self.svc.name,
            investigation_type="lab",
            urgency=InvestigationUrgency.ROUTINE,
            status=InvestigationStatus.SUGGESTED,
            position=1,
        )

    def clear_context(self) -> None:
        get_context_manager().clear()

    def _ensure_correlation_context(self) -> None:
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-cert-workflow")
        )

    def _pause(self) -> None:
        time.sleep(0.05)

    def _section_url(self, section_code: str) -> str:
        return reverse(
            "pre-consult-section",
            kwargs={"encounter_id": self.encounter.id, "section_code": section_code},
        )

    def _start_url(self) -> str:
        return reverse("consultation-start", kwargs={"encounter_id": self.encounter.id})

    def _complete_url(self) -> str:
        return reverse("consultation-complete", kwargs={"encounter_id": self.encounter.id})

    def _lab_admin_for_branch(self) -> tuple[APIClient, Any]:
        from labs.choices.auth import LabUserRole
        from labs.models import LabUser

        labadmin_group, _ = Group.objects.get_or_create(name="labadmin")
        user = User.objects.create_user(
            username=f"lab_cert_{uuid.uuid4().hex[:8]}",
            email=f"lab_cert_{uuid.uuid4().hex[:6]}@test.example",
            password="testpass123",
        )
        user.groups.add(labadmin_group)
        lab_user = LabUser.objects.create(
            user=user,
            organization=self.org,
            branch=self.branch,
            role=LabUserRole.ADMIN,
            employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
            is_primary_admin=True,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client, lab_user

    def run(
        self,
        testcase,
        *,
        lab_client: APIClient | None = None,
        lab_user: Any | None = None,
    ) -> CertificationWorkflowResult:
        """Execute the full certification workflow with on_commit callbacks."""
        if lab_client is None or lab_user is None:
            lab_client, lab_user = self._lab_admin_for_branch()
        lab_client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id

        self._ensure_correlation_context()
        with testcase.captureOnCommitCallbacks(execute=True):
            vitals_response = self.client.post(
                self._section_url("vitals"),
                {
                    "data": {
                        "height_cm": 172,
                        "weight_kg": 74,
                        "bp": {"systolic": 120, "diastolic": 80},
                    }
                },
                format="json",
            )
        if vitals_response.status_code != status.HTTP_200_OK:
            raise AssertionError(
                f"Vitals recording failed: {vitals_response.status_code} {vitals_response.data}"
            )
        self._pause()

        with testcase.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._start_url())
        if response.status_code != status.HTTP_200_OK:
            raise AssertionError(f"Start consultation failed: {response.status_code} {response.data}")
        self.consultation = Consultation.objects.get(encounter_id=self.encounter.id)
        self._attach_investigations(self.consultation)
        self._pause()

        self._ensure_correlation_context()
        with testcase.captureOnCommitCallbacks(execute=True):
            order_result = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=self.consultation,
                branch=self.branch,
                created_by=self.user,
            )
        if order_result.idempotent:
            raise AssertionError("Expected non-idempotent diagnostic order for certification workflow.")
        self.order_id = str(order_result.order.id)
        self._pause()

        self._ensure_correlation_context()
        with (
            override_settings(
                WHATSAPP_USE_SIMULATED_PROVIDER=True,
                WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED=True,
                WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME="diagnostic_test_recommendation_v3",
                WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS=(
                    "patient_name,test_names,mrp,quoted_price,savings"
                ),
            ),
            patch(
                "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
                "LabRecommendationService.recommend"
            ) as mock_recommend,
        ):
            mock_recommend.return_value = _available_result(
                self.consultation.id, self.branch, self.org
            )
            with testcase.captureOnCommitCallbacks(execute=True):
                message_id = run_prepare_and_enqueue(consultation_id=str(self.consultation.id))
            if message_id is None:
                raise AssertionError("Recommendation prepare/enqueue returned no message_id")
            with testcase.captureOnCommitCallbacks(execute=True):
                sent = WhatsAppService().send_recommendation_message(message_id=message_id)
            if sent.status != WhatsAppMessageStatus.SENT:
                raise AssertionError(f"Recommendation send failed with status {sent.status}")
        self._pause()

        line = order_result.order.test_lines.first()
        if line is None:
            raise AssertionError("Diagnostic order has no test lines for report lifecycle.")
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        self.report_id = str(report.id)

        self._ensure_correlation_context()
        with testcase.captureOnCommitCallbacks(execute=True):
            ArtifactUploadService.upload_report_artifacts(
                report=report,
                uploaded_files=[_pdf(b"cert-upload")],
                uploaded_by=lab_user.user,
                primary_file_index=0,
            )
        self._pause()

        detail_url = reverse("v1-report-detail", kwargs={"report_id": report.id})
        view_response = lab_client.get(detail_url)
        if view_response.status_code != status.HTTP_200_OK:
            raise AssertionError(f"Report view failed: {view_response.status_code}")
        self._pause()

        report.refresh_from_db()
        ReportWorkflowService.mark_ready(report, user=lab_user.user)
        download_url = reverse("v1-report-download", kwargs={"report_id": report.id})
        with patch(
            "diagnostics_engine.services.reports.report_download_service.generate_presigned_download_url",
            return_value="https://cert.example.test/report.pdf",
        ):
            download_response = lab_client.get(download_url)
        if download_response.status_code != status.HTTP_200_OK:
            raise AssertionError(f"Report download failed: {download_response.status_code}")
        self._pause()

        with override_settings(REPORT_DELIVERY_ASYNC=True):
            share_url = reverse("v1-report-send-whatsapp", kwargs={"report_id": report.id})
            with (
                patch.object(
                    __import__(
                        "diagnostics_engine.services.reports.report_delivery_service",
                        fromlist=["ReportDeliveryService"],
                    ).ReportDeliveryService,
                    "_build_delivery_download_url",
                    return_value=("https://cert.example.test/delivery", "delivery-token"),
                ),
                testcase.captureOnCommitCallbacks(execute=True),
            ):
                share_response = lab_client.post(
                    share_url,
                    {"recipient_phone": "9876543210", "channel": "WHATSAPP"},
                    format="json",
                )
        if share_response.status_code != status.HTTP_200_OK:
            raise AssertionError(f"Report share failed: {share_response.status_code}")
        self._pause()

        complete_payload = end_consultation_payload(
            drug_id=self.drug.id,
            symptoms=[{"name": "Headache", "detail": {"duration": "2 days"}}],
            diagnosis=[
                {
                    "label": "Certification Diagnosis",
                    "isCustom": True,
                    "is_custom": True,
                    "custom_name": "Certification Diagnosis",
                }
            ],
        )
        with testcase.captureOnCommitCallbacks(execute=True):
            complete_response = self.client.post(
                self._complete_url(),
                complete_payload,
                format="json",
            )
        if complete_response.status_code != status.HTTP_200_OK:
            raise AssertionError(
                f"Consultation complete failed: {complete_response.status_code} {complete_response.data}"
            )

        audits = list(
            ClinicalAudit.objects.filter(correlation_id=self.correlation_id).order_by("timestamp")
        )
        cert_audits = certification_action_audits(self.correlation_id)
        return CertificationWorkflowResult(
            correlation_id=self.correlation_id,
            consultation_id=str(self.consultation.id),
            patient_account_id=str(self.patient_account.id),
            encounter_id=str(self.encounter.id),
            order_id=self.order_id,
            report_id=self.report_id,
            audits=audits,
        )


def certification_action_audits(
    correlation_id: str,
) -> list[ClinicalAudit]:
    """Return certification-journey audits for a correlation ID."""
    required = set(CERTIFICATION_REQUIRED_ACTIONS)
    return list(
        ClinicalAudit.objects.filter(
            correlation_id=correlation_id,
            action__in=required,
        ).order_by("timestamp")
    )
