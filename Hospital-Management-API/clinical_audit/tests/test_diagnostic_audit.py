"""Unit tests for diagnostic and report audit integration."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from clinical_audit.enums import AuditAction, ClinicalEntity
from clinical_audit.exceptions import AuditSerializationError
from clinical_audit.models import ClinicalAudit
from consultations_core.models.consultation import Consultation
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.audit.diagnostic_audit_service import DiagnosticAuditService
from diagnostics_engine.audit.report_payload_builder import ReportPayloadBuilder
from diagnostics_engine.audit.test_payload_builder import TestPayloadBuilder
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from tests.factories.clinic import ClinicFactory

User = get_user_model()


def _doctor_user():
    g, _ = Group.objects.get_or_create(name="doctor")
    user = User.objects.create_user(
        username=f"doc_da_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    user.groups.add(g)
    return user


def _lab_user():
    g, _ = Group.objects.get_or_create(name="admin")
    user = User.objects.create_user(
        username=f"lab_da_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    user.groups.add(g)
    return user


def _encounter_bundle():
    clinic = ClinicFactory()
    doctor_user = _doctor_user()
    doc_profile, _ = DoctorModel.objects.get_or_create(
        user=doctor_user,
        defaults={"primary_specialization": "General"},
    )
    doc_profile.clinics.add(clinic)
    patient_user = User.objects.create_user(
        username=f"pat_da_{uuid.uuid4().hex[:10]}",
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


def _order_stub(**overrides):
    base = {
        "id": uuid.uuid4(),
        "source": "emr",
        "sample_collection_mode": "home",
        "test_lines": SimpleNamespace(count=lambda: 4),
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _report_stub(order=None):
    if order is None:
        encounter, consultation, _, _ = _encounter_bundle()
        order = SimpleNamespace(
            id=uuid.uuid4(),
            encounter=encounter,
            consultation=consultation,
        )
    line = SimpleNamespace(order=order)
    return SimpleNamespace(id=uuid.uuid4(), order_test_line=line)


class TestPayloadBuilderTests(TestCase):
    def test_build_ordered_maps_fields(self) -> None:
        payload = TestPayloadBuilder.build_ordered(
            test_count=3,
            order_source="consultation",
            home_collection=True,
        )
        self.assertEqual(payload["test_count"], 3)
        self.assertEqual(payload["order_source"], "consultation")
        self.assertTrue(payload["home_collection"])

    def test_build_recommendation_sent_maps_fields(self) -> None:
        payload = TestPayloadBuilder.build_recommendation_sent(
            recommendation_channel="whatsapp",
            test_count=4,
        )
        self.assertEqual(payload["recommendation_channel"], "whatsapp")
        self.assertEqual(payload["test_count"], 4)

    def test_order_source_label_normalizes_emr(self) -> None:
        self.assertEqual(TestPayloadBuilder.order_source_label("emr"), "consultation")

    def test_home_collection_for_order(self) -> None:
        self.assertTrue(TestPayloadBuilder.home_collection_for_order(_order_stub()))
        self.assertFalse(
            TestPayloadBuilder.home_collection_for_order(
                _order_stub(sample_collection_mode="lab")
            )
        )

    def test_order_test_count(self) -> None:
        self.assertEqual(TestPayloadBuilder.order_test_count(_order_stub()), 4)

    def test_recommendation_count_from_payload(self) -> None:
        self.assertEqual(
            TestPayloadBuilder.recommendation_count_from_payload({"test_count": 5}),
            5,
        )
        self.assertEqual(
            TestPayloadBuilder.recommendation_count_from_payload({"expanded_tests": [1, 2, 3]}),
            3,
        )


class ReportPayloadBuilderTests(TestCase):
    def test_build_uploaded_maps_fields(self) -> None:
        payload = ReportPayloadBuilder.build_uploaded(
            artifact_type="PDF",
            report_count=2,
            verified=True,
        )
        self.assertEqual(payload["artifact_type"], "PDF")
        self.assertEqual(payload["report_count"], 2)
        self.assertTrue(payload["verified"])

    def test_build_viewed_maps_fields(self) -> None:
        payload = ReportPayloadBuilder.build_viewed(
            viewer_role="Doctor",
            viewer_platform="Web",
        )
        self.assertEqual(payload["viewer_role"], "Doctor")

    def test_build_downloaded_maps_fields(self) -> None:
        payload = ReportPayloadBuilder.build_downloaded()
        self.assertEqual(payload["download_format"], "PDF")
        self.assertEqual(payload["download_channel"], "Web")

    def test_build_shared_maps_fields(self) -> None:
        payload = ReportPayloadBuilder.build_shared()
        self.assertEqual(payload["share_channel"], "WhatsApp")
        self.assertEqual(payload["recipient_type"], "Patient")

    def test_resolve_viewer_role_doctor(self) -> None:
        self.assertEqual(
            ReportPayloadBuilder.resolve_viewer_role(_doctor_user()),
            "Doctor",
        )

    def test_resolve_viewer_role_anonymous(self) -> None:
        request_user = SimpleNamespace(is_authenticated=False)
        self.assertEqual(
            ReportPayloadBuilder.resolve_viewer_role(request_user),
            "Anonymous",
        )

    def test_share_channel_label(self) -> None:
        self.assertEqual(ReportPayloadBuilder.share_channel_label("EMAIL"), "Email")
        self.assertEqual(ReportPayloadBuilder.share_channel_label("WHATSAPP"), "WhatsApp")

    def test_forbidden_payload_key_rejected(self) -> None:
        from clinical_audit.domain.utils import sanitize_audit_payload

        with self.assertRaises(AuditSerializationError):
            sanitize_audit_payload({"pdf_data": "binary-blob"})


class DiagnosticAuditServiceTests(TestCase):
    def test_emit_test_ordered_creates_audit(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        order = _order_stub()
        result = DiagnosticAuditService.emit_test_ordered(
            encounter, consultation, user, order=order
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.TEST_ORDERED)
        self.assertEqual(audit.resource_type, ClinicalEntity.DIAGNOSTIC_TEST)

    def test_emit_test_ordered_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        order = _order_stub()
        first = DiagnosticAuditService.emit_test_ordered(
            encounter, consultation, user, order=order
        )
        second = DiagnosticAuditService.emit_test_ordered(
            encounter, consultation, user, order=order
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_test_recommendation_sent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rec_id = uuid.uuid4()
        result = DiagnosticAuditService.emit_test_recommendation_sent(
            encounter,
            consultation,
            user,
            recommendation_id=rec_id,
            test_count=3,
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.RECOMMENDATION_SENT)
        self.assertEqual(audit.new_value["payload"]["test_count"], 3)

    def test_emit_test_recommendation_sent_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rec_id = uuid.uuid4()
        first = DiagnosticAuditService.emit_test_recommendation_sent(
            encounter, consultation, user, recommendation_id=rec_id
        )
        second = DiagnosticAuditService.emit_test_recommendation_sent(
            encounter, consultation, user, recommendation_id=rec_id
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_report_uploaded(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        report = _report_stub(
            order=SimpleNamespace(
                id=uuid.uuid4(),
                encounter=encounter,
                consultation=consultation,
            )
        )
        result = DiagnosticAuditService.emit_report_uploaded(
            encounter, consultation, _lab_user(), report=report
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.REPORT_UPLOADED)

    def test_emit_report_uploaded_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        report = _report_stub(
            order=SimpleNamespace(
                id=uuid.uuid4(),
                encounter=encounter,
                consultation=consultation,
            )
        )
        first = DiagnosticAuditService.emit_report_uploaded(
            encounter, consultation, user, report=report
        )
        second = DiagnosticAuditService.emit_report_uploaded(
            encounter, consultation, user, report=report
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_report_viewed(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        report = _report_stub(
            order=SimpleNamespace(
                id=uuid.uuid4(),
                encounter=encounter,
                consultation=consultation,
            )
        )
        result = DiagnosticAuditService.emit_report_viewed(
            encounter, consultation, user, report=report
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.REPORT_VIEWED)

    def test_emit_report_downloaded(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        report = _report_stub(
            order=SimpleNamespace(
                id=uuid.uuid4(),
                encounter=encounter,
                consultation=consultation,
            )
        )
        result = DiagnosticAuditService.emit_report_downloaded(
            encounter, consultation, user, report=report
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.REPORT_DOWNLOADED)

    def test_emit_report_shared(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        report = _report_stub(
            order=SimpleNamespace(
                id=uuid.uuid4(),
                encounter=encounter,
                consultation=consultation,
            )
        )
        result = DiagnosticAuditService.emit_report_shared(
            encounter, consultation, _lab_user(), report=report
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.REPORT_SHARED)

    def test_view_and_download_not_deduplicated(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        report = _report_stub(
            order=SimpleNamespace(
                id=uuid.uuid4(),
                encounter=encounter,
                consultation=consultation,
            )
        )
        DiagnosticAuditService.emit_report_viewed(
            encounter, consultation, user, report=report
        )
        DiagnosticAuditService.emit_report_viewed(
            encounter, consultation, user, report=report
        )
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.REPORT_VIEWED).count(),
            2,
        )

    def test_failure_isolation_returns_unsuccessful_result(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        order = _order_stub()
        with patch(
            "diagnostics_engine.audit.diagnostic_audit_service.ClinicalAuditService.record",
            return_value=type(
                "R",
                (),
                {"success": False, "error": "boom", "correlation_id": str(uuid.uuid4())},
            )(),
        ):
            result = DiagnosticAuditService.emit_test_ordered(
                encounter, consultation, user, order=order
            )
        self.assertFalse(result.success)

    def test_resolve_context_from_report(self) -> None:
        encounter, consultation, _, _ = _encounter_bundle()
        order = SimpleNamespace(encounter=encounter, consultation=consultation)
        report = SimpleNamespace(order_test_line=SimpleNamespace(order=order))
        enc, cons = DiagnosticAuditService.resolve_context_from_report(report)
        self.assertEqual(enc.id, encounter.id)
        self.assertEqual(cons.id, consultation.id)

    def test_resolve_source_from_user(self) -> None:
        self.assertEqual(
            DiagnosticAuditService.resolve_source_from_user(_doctor_user()),
            "doctor",
        )
        self.assertEqual(
            DiagnosticAuditService.resolve_source_from_user(None, default="lab"),
            "lab",
        )
