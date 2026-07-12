"""Integration tests for consultation audit via API workflows."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinical_audit.enums import AuditAction
from clinical_audit.models import ClinicalAudit
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.findings import ConsultationFinding, CustomFinding
from consultations_core.services.consultation_start_service import start_consultation_for_encounter
from consultations_core.services.encounter_service import EncounterService
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from shared.logging.context import LogContext, get_context_manager

User = get_user_model()


def _doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    user = User.objects.create_user(
        username=f"doc_cai_{uuid.uuid4().hex[:10]}",
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
        username=f"pat_cai_{uuid.uuid4().hex[:10]}",
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
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(
        status="consultation_in_progress"
    )
    encounter.refresh_from_db()
    return consultation, encounter, clinic


def _base_complete_payload():
    return {
        "mode": "commit",
        "store": {
            "sectionItems": {
                "symptoms": [],
                "findings": [],
                "diagnosis": [],
                "medicines": [],
                "investigations": [],
                "instructions": {
                    "template_instructions": [],
                    "custom_instructions": [],
                },
            },
            "draftFindings": [],
        },
    }


class ConsultationAuditIntegrationTests(TestCase):
    def setUp(self) -> None:
        self.client, self.doctor_user = _doctor_client()
        self.consultation, self.encounter, self.clinic = _encounter_in_consultation(
            self.doctor_user
        )
        self.correlation_id = str(uuid.uuid4())
        self.client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-int")
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def _complete_url(self):
        return reverse("consultation-complete", kwargs={"encounter_id": self.encounter.id})

    def _start_url(self):
        return reverse("consultation-start", kwargs={"encounter_id": self.encounter.id})

    def _cancel_url(self):
        return reverse("encounter-cancel", kwargs={"encounter_id": self.encounter.id})

    def test_start_api_emits_consultation_started_audit(self) -> None:
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(
            status="pre_consultation_completed"
        )
        Consultation.objects.filter(pk=self.consultation.pk).delete()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._start_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.CONSULTATION_STARTED)
        self.assertEqual(audits.count(), 1)
        self.assertEqual(audits.first().correlation_id, self.correlation_id)

    def test_complete_api_emits_consultation_completed_audit(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._complete_url(), _base_complete_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(
            action=AuditAction.CONSULTATION_COMPLETED,
            consultation_id=str(self.consultation.id),
        )
        self.assertEqual(audits.count(), 1)
        payload = audits.first().new_value.get("payload", {})
        self.assertEqual(payload.get("completion_source"), "doctor")

    def test_duplicate_complete_creates_single_audit(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            first = self.client.post(self._complete_url(), _base_complete_payload(), format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)
        with self.captureOnCommitCallbacks(execute=True):
            second = self.client.post(self._complete_url(), _base_complete_payload(), format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            ClinicalAudit.objects.filter(
                action=AuditAction.CONSULTATION_COMPLETED,
                consultation_id=str(self.consultation.id),
            ).count(),
            1,
        )

    def test_cancel_api_emits_consultation_cancelled_audit(self) -> None:
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self._cancel_url(),
                {"reason": "Patient unavailable"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.CONSULTATION_CANCELLED)
        self.assertEqual(audits.count(), 1)
        payload = audits.first().new_value.get("payload", {})
        self.assertEqual(payload.get("reason"), "Patient unavailable")

    def test_findings_patch_emits_granular_updated_audit(self) -> None:
        custom = CustomFinding.objects.create(
            consultation=self.consultation,
            name=f"Rash {uuid.uuid4().hex[:6]}",
        )
        finding = ConsultationFinding.objects.create(
            consultation=self.consultation,
            custom_finding=custom,
            is_custom=True,
            display_name=custom.name,
        )
        url = reverse("consultation-finding-update-delete", kwargs={"pk": finding.id})
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(url, {"note": "updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audit = ClinicalAudit.objects.filter(
            action=AuditAction.CONSULTATION_FINDINGS_UPDATED
        ).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.new_value["payload"]["section"], "findings")

    def test_audit_failure_does_not_block_complete(self) -> None:
        with patch(
            "consultations_core.audit.consultation_audit_service.ClinicalAuditService.record",
            return_value=__import__(
                "clinical_audit.domain.types", fromlist=["AuditRecordResult"]
            ).AuditRecordResult(success=False, correlation_id=self.correlation_id, error="fail"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    self._complete_url(), _base_complete_payload(), format="json"
                )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.consultation.refresh_from_db()
        self.assertTrue(self.consultation.is_finalized)

    def test_shared_correlation_across_start_and_complete(self) -> None:
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(
            status="pre_consultation_completed"
        )
        consultation_id = self.consultation.id
        Consultation.objects.filter(pk=consultation_id).delete()
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self._start_url())
        consultation = Consultation.objects.get(encounter_id=self.encounter.id)
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(
            status="consultation_in_progress"
        )
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self._complete_url(), _base_complete_payload(), format="json")
        correlation_ids = set(
            ClinicalAudit.objects.filter(
                consultation_id=str(consultation.id)
            ).values_list("correlation_id", flat=True)
        )
        self.assertEqual(correlation_ids, {self.correlation_id})

    def test_service_start_emits_after_commit_only(self) -> None:
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(
            status="pre_consultation_completed"
        )
        Consultation.objects.filter(encounter_id=self.encounter.id).delete()
        with patch(
            "consultations_core.audit.consultation_audit_service.ClinicalAuditService.record"
        ) as record:
            with self.assertRaises(Exception):
                with self.captureOnCommitCallbacks(execute=False):
                    with patch(
                        "consultations_core.services.consultation_start_service.Consultation.objects.create",
                        side_effect=Exception("rollback"),
                    ):
                        start_consultation_for_encounter(
                            encounter_id=self.encounter.id,
                            user=self.doctor_user,
                            source="doctor",
                        )
        record.assert_not_called()
