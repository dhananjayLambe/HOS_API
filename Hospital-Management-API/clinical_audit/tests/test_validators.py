"""Unit tests for AuditRequestValidator."""

from __future__ import annotations

import uuid

from django.test import TestCase

from clinical_audit.domain.validators import AuditRequestValidator
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.exceptions import AuditValidationError
from tests.factories.clinic import ClinicFactory


def _base_kwargs(**overrides):
    clinic = overrides.pop("clinic", None) or ClinicFactory()
    payload = {
        "action": AuditAction.CONSULTATION_STARTED,
        "event": "Consultation started",
        "resource_type": ClinicalEntity.CONSULTATION,
        "resource_id": str(uuid.uuid4()),
        "source": AuditSource.DOCTOR,
        "user_id": "USR-001",
        "organization_id": str(clinic.id),
        "validate_references": True,
    }
    payload.update(overrides)
    return payload


class AuditRequestValidatorTests(TestCase):
    def test_valid_request_returns_validated_audit_request(self) -> None:
        kwargs = _base_kwargs()
        validated = AuditRequestValidator.validate(**kwargs)

        self.assertEqual(validated.action, AuditAction.CONSULTATION_STARTED)
        self.assertEqual(validated.event, "Consultation started")
        self.assertEqual(validated.module, "consultation")
        self.assertEqual(validated.organization_id, kwargs["organization_id"])

    def test_missing_action_raises(self) -> None:
        kwargs = _base_kwargs(action=None)
        with self.assertRaises(AuditValidationError):
            AuditRequestValidator.validate(**kwargs)

    def test_missing_resource_id_raises(self) -> None:
        kwargs = _base_kwargs(resource_id="")
        with self.assertRaises(AuditValidationError):
            AuditRequestValidator.validate(**kwargs)

    def test_invalid_action_enum_raises(self) -> None:
        kwargs = _base_kwargs(action="not.valid")
        with self.assertRaises(AuditValidationError):
            AuditRequestValidator.validate(**kwargs)

    def test_invalid_correlation_id_raises(self) -> None:
        kwargs = _base_kwargs(correlation_id="not-a-uuid")
        with self.assertRaises(AuditValidationError):
            AuditRequestValidator.validate(**kwargs)

    def test_invalid_organization_uuid_raises(self) -> None:
        kwargs = _base_kwargs(organization_id="bad-id", validate_references=False)
        with self.assertRaises(AuditValidationError):
            AuditRequestValidator.validate(**kwargs)

    def test_unknown_organization_raises(self) -> None:
        kwargs = _base_kwargs(organization_id=str(uuid.uuid4()))
        with self.assertRaises(AuditValidationError) as ctx:
            AuditRequestValidator.validate(**kwargs)
        self.assertIn("organization_id not found", str(ctx.exception))

    def test_non_dict_payload_raises(self) -> None:
        kwargs = _base_kwargs(payload=["bad"], validate_references=False)
        with self.assertRaises(AuditValidationError):
            AuditRequestValidator.validate(**kwargs)

    def test_non_serializable_payload_raises(self) -> None:
        kwargs = _base_kwargs(
            payload={"key": object()},
            validate_references=False,
        )
        with self.assertRaises(AuditValidationError) as ctx:
            AuditRequestValidator.validate(**kwargs)
        self.assertIn("JSON serializable", str(ctx.exception))

    def test_module_derived_from_action_when_omitted(self) -> None:
        kwargs = _base_kwargs(module=None, validate_references=False)
        validated = AuditRequestValidator.validate(**kwargs)
        self.assertEqual(validated.module, "consultation")

    def test_skip_reference_checks_when_disabled(self) -> None:
        kwargs = _base_kwargs(
            organization_id=str(uuid.uuid4()),
            validate_references=False,
        )
        validated = AuditRequestValidator.validate(**kwargs)
        self.assertEqual(validated.organization_id, kwargs["organization_id"])

    def test_clinical_documentation_actions_accepted(self) -> None:
        for action, entity in (
            (AuditAction.ALLERGY_ADDED, ClinicalEntity.ALLERGY),
            (AuditAction.ALLERGY_UPDATED, ClinicalEntity.ALLERGY),
            (AuditAction.CLINICAL_NOTES_UPDATED, ClinicalEntity.CLINICAL_NOTES),
            (AuditAction.VITAL_SIGNS_RECORDED, ClinicalEntity.VITAL_SIGNS),
            (AuditAction.SYMPTOMS_RECORDED, ClinicalEntity.SYMPTOMS),
            (AuditAction.DIAGNOSIS_ADDED, ClinicalEntity.DIAGNOSIS),
            (AuditAction.DIAGNOSIS_UPDATED, ClinicalEntity.DIAGNOSIS),
        ):
            with self.subTest(action=action, entity=entity):
                validated = AuditRequestValidator.validate(
                    **_base_kwargs(
                        action=action,
                        event=action.label,
                        resource_type=entity,
                        validate_references=False,
                    )
                )
                self.assertEqual(validated.action, action)
                self.assertEqual(validated.resource_type, entity)

    def test_diagnostic_audit_actions_accepted(self) -> None:
        for action, entity in (
            (AuditAction.TEST_ORDERED, ClinicalEntity.DIAGNOSTIC_TEST),
            (AuditAction.RECOMMENDATION_SENT, ClinicalEntity.RECOMMENDATION),
            (AuditAction.REPORT_UPLOADED, ClinicalEntity.REPORT),
            (AuditAction.REPORT_VIEWED, ClinicalEntity.REPORT),
            (AuditAction.REPORT_DOWNLOADED, ClinicalEntity.REPORT),
            (AuditAction.REPORT_SHARED, ClinicalEntity.REPORT),
        ):
            with self.subTest(action=action, entity=entity):
                validated = AuditRequestValidator.validate(
                    **_base_kwargs(
                        action=action,
                        event=action.label,
                        resource_type=entity,
                        validate_references=False,
                    )
                )
                self.assertEqual(validated.action, action)
                self.assertEqual(validated.resource_type, entity)

    def test_prescription_audit_actions_accepted(self) -> None:
        for action, entity in (
            (AuditAction.PRESCRIPTION_CREATED, ClinicalEntity.PRESCRIPTION),
            (AuditAction.PRESCRIPTION_SIGNED, ClinicalEntity.PRESCRIPTION),
            (AuditAction.PRESCRIPTION_DOWNLOADED, ClinicalEntity.PRESCRIPTION),
            (AuditAction.RECOMMENDATION_GENERATED, ClinicalEntity.RECOMMENDATION),
            (AuditAction.RECOMMENDATION_ACCEPTED, ClinicalEntity.RECOMMENDATION),
        ):
            with self.subTest(action=action, entity=entity):
                validated = AuditRequestValidator.validate(
                    **_base_kwargs(
                        action=action,
                        event=action.label,
                        resource_type=entity,
                        validate_references=False,
                    )
                )
                self.assertEqual(validated.action, action)
                self.assertEqual(validated.resource_type, entity)
