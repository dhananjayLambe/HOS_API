"""Unit tests for ClinicalAuditService."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.test import TestCase

from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.exceptions import AuditRepositoryError, AuditValidationError
from clinical_audit.models import ClinicalAudit
from clinical_audit.services import AuditRecordResult, ClinicalAuditService
from shared.logging.context import LogContext, get_context_manager
from tests.factories.clinic import ClinicFactory


class ClinicalAuditServiceTests(TestCase):
    def setUp(self) -> None:
        self.clinic = ClinicFactory()
        self.correlation_id = str(uuid.uuid4())
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-abc")
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def _record_kwargs(self, **overrides):
        payload = {
            "action": AuditAction.CONSULTATION_STARTED,
            "event": "Consultation started",
            "resource_type": ClinicalEntity.CONSULTATION,
            "resource_id": str(uuid.uuid4()),
            "source": AuditSource.DOCTOR,
            "user_id": "USR-001",
            "organization_id": str(self.clinic.id),
            "payload": {"step": "start"},
        }
        payload.update(overrides)
        return payload

    def test_record_success(self) -> None:
        result = ClinicalAuditService.record(**self._record_kwargs())

        self.assertIsInstance(result, AuditRecordResult)
        self.assertTrue(result.success)
        self.assertIsNotNone(result.audit_id)
        self.assertEqual(result.correlation_id, self.correlation_id)
        self.assertEqual(ClinicalAudit.objects.count(), 1)

    def test_record_validation_failure_is_fail_open(self) -> None:
        result = ClinicalAuditService.record(
            **self._record_kwargs(organization_id=str(uuid.uuid4()))
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_type, AuditValidationError.__name__)
        self.assertEqual(ClinicalAudit.objects.count(), 0)

    def test_record_repository_failure_is_fail_open(self) -> None:
        with patch.object(
            ClinicalAuditRepository,
            "save",
            side_effect=AuditRepositoryError("db down"),
        ):
            result = ClinicalAuditService.record(**self._record_kwargs())

        self.assertFalse(result.success)
        self.assertEqual(result.error_type, AuditRepositoryError.__name__)

    def test_raise_on_failure_propagates_validation_error(self) -> None:
        with self.assertRaises(AuditValidationError):
            ClinicalAuditService.record(
                **self._record_kwargs(organization_id=str(uuid.uuid4())),
                raise_on_failure=True,
            )

    def test_correlation_id_from_argument_overrides_context(self) -> None:
        explicit = str(uuid.uuid4())
        result = ClinicalAuditService.record(
            **self._record_kwargs(correlation_id=explicit)
        )
        self.assertTrue(result.success)
        self.assertEqual(result.correlation_id, explicit)

    def test_propagates_shared_correlation_across_events(self) -> None:
        resource_id = str(uuid.uuid4())
        first = ClinicalAuditService.record(
            **self._record_kwargs(
                resource_id=resource_id,
                action=AuditAction.CONSULTATION_STARTED,
                event="Started",
            )
        )
        second = ClinicalAuditService.record(
            **self._record_kwargs(
                resource_id=resource_id,
                action=AuditAction.CONSULTATION_COMPLETED,
                event="Completed",
            )
        )

        self.assertTrue(first.success)
        self.assertTrue(second.success)
        self.assertEqual(first.correlation_id, second.correlation_id)
        self.assertEqual(
            len(
                ClinicalAuditRepository().get_by_correlation_id(
                    first.correlation_id
                )
            ),
            2,
        )
