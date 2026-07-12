"""Integration tests for prescription and recommendation audit workflows."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinical_audit.enums import AuditAction
from clinical_audit.models import ClinicalAudit
from consultations_core.audit.prescription.prescription_audit_service import PrescriptionAuditService
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import Prescription, PrescriptionStatus
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from diagnostics_engine.tests.test_lab_recommendation_service import _clinic_with_pincode, _lab_org_branch_area
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _pricing,
)
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from medicines.models import DrugMaster, DrugType, FormulationMaster
from patient_account.models import PatientAccount, PatientProfile
from shared.logging.context import LogContext, get_context_manager
from tests.helpers.medicine_masters import ensure_autofill_route_and_dose_masters
from tests.helpers.payloads import end_consultation_payload

User = get_user_model()
MARKETPLACE_URL = reverse("v1-marketplace-diagnostics-recommendations")


def _doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    user = User.objects.create_user(
        username=f"doc_pai_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    user.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _encounter_in_consultation(doctor_user):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    doc_profile, _ = DoctorModel.objects.get_or_create(
        user=doctor_user,
        defaults={"primary_specialization": "General"},
    )
    doc_profile.clinics.add(clinic)
    pu = User.objects.create_user(
        username=f"pat_pai_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    pa = PatientAccount.objects.create(user=pu)
    pa.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=pa,
        first_name="Pat",
        last_name="Test",
        relation="self",
        gender="male",
        age_years=30,
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=pa,
        patient_profile=profile,
        doctor=doc_profile,
        created_by=doctor_user,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
    encounter.refresh_from_db()
    return consultation, encounter, clinic


class PrescriptionAuditIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        ensure_autofill_route_and_dose_masters()
        cls.form = FormulationMaster.objects.create(name=f"form-{uuid.uuid4().hex[:6]}")
        cls.drug = DrugMaster.objects.create(
            code=f"PAI-DRUG-{uuid.uuid4().hex[:6]}",
            brand_name="PAI Paracetamol",
            formulation=cls.form,
            drug_type=DrugType.TABLET,
            is_active=True,
        )

    def setUp(self) -> None:
        self.client, self.doctor_user = _doctor_client()
        self.consultation, self.encounter, self.clinic = _encounter_in_consultation(
            self.doctor_user
        )
        self.correlation_id = str(uuid.uuid4())
        self.client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-pai")
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def _complete_url(self):
        return reverse("consultation-complete", kwargs={"encounter_id": self.encounter.id})

    def _complete_with_medicines(self):
        payload = end_consultation_payload(drug_id=self.drug.id)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._complete_url(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return Prescription.objects.filter(
            consultation=self.consultation, is_active=True
        ).first()

    def test_end_consultation_emits_prescription_created_and_signed(self) -> None:
        prescription = self._complete_with_medicines()
        self.assertIsNotNone(prescription)
        created = ClinicalAudit.objects.filter(action=AuditAction.PRESCRIPTION_CREATED)
        signed = ClinicalAudit.objects.filter(action=AuditAction.PRESCRIPTION_SIGNED)
        self.assertEqual(created.count(), 1)
        self.assertEqual(signed.count(), 1)
        self.assertEqual(created.first().resource_id, str(prescription.id))
        self.assertEqual(signed.first().resource_id, str(prescription.id))

    def test_prescription_created_payload_medicine_count(self) -> None:
        prescription = self._complete_with_medicines()
        audit = ClinicalAudit.objects.get(action=AuditAction.PRESCRIPTION_CREATED)
        self.assertEqual(
            audit.new_value["payload"]["medicine_count"],
            prescription.lines.count(),
        )

    def test_prescription_signed_payload_finalized(self) -> None:
        self._complete_with_medicines()
        audit = ClinicalAudit.objects.get(action=AuditAction.PRESCRIPTION_SIGNED)
        self.assertTrue(audit.new_value["payload"]["finalized"])

    def test_prescription_audit_shares_correlation_id(self) -> None:
        self._complete_with_medicines()
        for action in (AuditAction.PRESCRIPTION_CREATED, AuditAction.PRESCRIPTION_SIGNED):
            audit = ClinicalAudit.objects.get(action=action)
            self.assertEqual(audit.correlation_id, self.correlation_id)

    def test_prescription_created_idempotent_on_duplicate_emit(self) -> None:
        prescription = self._complete_with_medicines()
        encounter = self.consultation.encounter
        first = PrescriptionAuditService.emit_prescription_created(
            encounter,
            self.consultation,
            self.doctor_user,
            prescription=prescription,
        )
        second = PrescriptionAuditService.emit_prescription_created(
            encounter,
            self.consultation,
            self.doctor_user,
            prescription=prescription,
        )
        self.assertIsNone(first)
        self.assertIsNone(second)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.PRESCRIPTION_CREATED).count(),
            1,
        )

    def test_prescription_signed_idempotent_on_duplicate_emit(self) -> None:
        prescription = self._complete_with_medicines()
        encounter = self.consultation.encounter
        first = PrescriptionAuditService.emit_prescription_signed(
            encounter,
            self.consultation,
            self.doctor_user,
            prescription=prescription,
        )
        second = PrescriptionAuditService.emit_prescription_signed(
            encounter,
            self.consultation,
            self.doctor_user,
            prescription=prescription,
        )
        self.assertIsNone(first)
        self.assertIsNone(second)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.PRESCRIPTION_SIGNED).count(),
            1,
        )

    def test_audit_failure_does_not_block_end_consultation(self) -> None:
        payload = end_consultation_payload(drug_id=self.drug.id)
        with patch(
            "consultations_core.audit.prescription.prescription_audit_service.ClinicalAuditService.record",
            return_value=type(
                "R",
                (),
                {"success": False, "error": "boom", "correlation_id": self.correlation_id},
            )(),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(self._complete_url(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(
            Prescription.objects.filter(
                consultation=self.consultation, is_active=True
            ).exists()
        )

    def test_empty_medicines_does_not_emit_prescription_audit(self) -> None:
        payload = end_consultation_payload()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._complete_url(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(
            ClinicalAudit.objects.filter(
                action__in=[
                    AuditAction.PRESCRIPTION_CREATED,
                    AuditAction.PRESCRIPTION_SIGNED,
                ]
            ).count(),
            0,
        )

    def _attach_pdf(self, prescription):
        prescription.pdf_file.save("test.pdf", ContentFile(b"%PDF-1.4 test"), save=False)
        Prescription.objects.filter(pk=prescription.pk).update(
            pdf_file=prescription.pdf_file.name
        )
        prescription.refresh_from_db()
        return prescription

    def test_prescription_download_emits_downloaded(self) -> None:
        prescription = self._attach_pdf(self._complete_with_medicines())
        url = reverse("prescription-download", kwargs={"prescription_id": prescription.id})
        response = APIClient().get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audits = ClinicalAudit.objects.filter(action=AuditAction.PRESCRIPTION_DOWNLOADED)
        self.assertEqual(audits.count(), 1)
        self.assertEqual(audits.first().new_value["payload"]["downloaded_by"], "Anonymous")

    def test_prescription_download_as_doctor(self) -> None:
        prescription = self._attach_pdf(self._complete_with_medicines())
        url = reverse("prescription-download", kwargs={"prescription_id": prescription.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audit = ClinicalAudit.objects.get(action=AuditAction.PRESCRIPTION_DOWNLOADED)
        self.assertEqual(audit.new_value["payload"]["downloaded_by"], "Doctor")

    def test_prescription_download_emits_per_request(self) -> None:
        prescription = self._attach_pdf(self._complete_with_medicines())
        url = reverse("prescription-download", kwargs={"prescription_id": prescription.id})
        client = APIClient()
        client.get(url)
        client.get(url)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.PRESCRIPTION_DOWNLOADED).count(),
            2,
        )

    def test_prescription_audit_records_encounter_and_consultation_ids(self) -> None:
        self._complete_with_medicines()
        audit = ClinicalAudit.objects.get(action=AuditAction.PRESCRIPTION_CREATED)
        self.assertEqual(audit.encounter_id, str(self.encounter.id))
        self.assertEqual(audit.consultation_id, str(self.consultation.id))

    def test_prescription_updated_facade_stores_snapshot(self) -> None:
        prescription = self._complete_with_medicines()
        encounter = self.consultation.encounter
        result = PrescriptionAuditService.emit_prescription_updated(
            encounter,
            self.consultation,
            self.doctor_user,
            prescription=prescription,
            changed_fields=["medicine_count"],
            prior_state={"medicine_count": 0, "status": PrescriptionStatus.DRAFT},
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(action=AuditAction.PRESCRIPTION_UPDATED)
        self.assertEqual(audit.previous_value["medicine_count"], 0)


class RecommendationAuditIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(
            name="PAI Cat", code=f"PAI-{uuid.uuid4().hex[:6]}"
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"pai_svc_{uuid.uuid4().hex[:6]}",
            name="PAI Test",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_pai_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="PAI Pkg",
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
        from datetime import time

        from labs.models.lab_auth import LabBranch

        LabBranch.objects.filter(pk=cls.branch.pk).update(
            opening_time=time(8, 0),
            closing_time=time(20, 0),
        )
        cls.branch.refresh_from_db()
        _pricing(cls.branch, cls.svc, cls.pkg)

    def setUp(self) -> None:
        self.clinic = _clinic_with_pincode("400001")
        g, _ = Group.objects.get_or_create(name="doctor")
        self.user, self.doc = _doctor_user_and_profile(self.clinic)
        self.user.groups.add(g)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.correlation_id = str(uuid.uuid4())
        self.client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-rec")
        )
        self.consultation, self.encounter, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(clinic=self.clinic)
        self.encounter.refresh_from_db()

    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_marketplace_recommendation_emits_generated(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                MARKETPLACE_URL,
                {"consultation_id": str(self.consultation.id)},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["recommendation"]["available"])
        rec_id = response.data["metadata"]["recommendation_id"]
        audits = ClinicalAudit.objects.filter(action=AuditAction.RECOMMENDATION_GENERATED)
        self.assertEqual(audits.count(), 1)
        self.assertEqual(audits.first().resource_id, rec_id)
        self.assertGreaterEqual(audits.first().new_value["payload"]["recommendation_count"], 1)

    def test_recommendation_generated_shares_correlation_id(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                MARKETPLACE_URL,
                {"consultation_id": str(self.consultation.id)},
                format="json",
            )
        audit = ClinicalAudit.objects.get(action=AuditAction.RECOMMENDATION_GENERATED)
        self.assertEqual(audit.correlation_id, self.correlation_id)

    def test_recommendation_generated_idempotent(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                MARKETPLACE_URL,
                {"consultation_id": str(self.consultation.id)},
                format="json",
            )
        rec_id = response.data["metadata"]["recommendation_id"]
        encounter = self.consultation.encounter
        second = PrescriptionAuditService.emit_recommendation_generated(
            encounter,
            self.consultation,
            self.user,
            recommendation_id=rec_id,
            result=None,
        )
        self.assertIsNone(second)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.RECOMMENDATION_GENERATED).count(),
            1,
        )

    def test_recommendation_not_emitted_when_unavailable(self) -> None:
        from diagnostics_engine.domain.recommendation import (
            RecommendationFailureReason,
            RecommendationResult,
        )

        with patch(
            "diagnostics_engine.api.views.marketplace_recommendation.LabRecommendationService.recommend"
        ) as recommend:
            recommend.return_value = RecommendationResult(
                available=False,
                failure_reason=RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
                consultation_id=self.consultation.id,
                recommended_lab=None,
                recommended_branch=None,
                collection_mode="lab_visit",
            )
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    MARKETPLACE_URL,
                    {"consultation_id": str(self.consultation.id)},
                    format="json",
                )
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.RECOMMENDATION_GENERATED).count(),
            0,
        )

    def test_recommendation_audit_failure_does_not_block_api(self) -> None:
        with patch(
            "consultations_core.audit.prescription.prescription_audit_service.ClinicalAuditService.record",
            return_value=type(
                "R",
                (),
                {"success": False, "error": "boom", "correlation_id": self.correlation_id},
            )(),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    MARKETPLACE_URL,
                    {"consultation_id": str(self.consultation.id)},
                    format="json",
                )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_hook_schedule_failure_is_fail_open(self) -> None:
        with patch(
            "consultations_core.audit.prescription.hooks.emit_after_commit",
            side_effect=RuntimeError("schedule failed"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    MARKETPLACE_URL,
                    {"consultation_id": str(self.consultation.id)},
                    format="json",
                )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
