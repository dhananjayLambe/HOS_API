"""Service-layer tests for list and summary."""

from __future__ import annotations

from django.test import TestCase

from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.dto import WorkspaceListResponseDTO, WorkspaceSummaryResponseDTO
from doctor_report_workspace.services.workspace.workspace_list_service import (
    WorkspaceListService,
    WorkspaceListValidationError,
)
from doctor_report_workspace.services.workspace.workspace_summary_service import (
    WorkspaceSummaryService,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    mark_line_pending_upload,
)


class WorkspaceListServiceTests(TestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.service = WorkspaceListService()

    def test_default_queue_uses_reports_only(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        pending, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="Await"
        )
        mark_line_pending_upload(line=pending)

        dto = self.service.list_reports(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            params={},
        )
        self.assertIsInstance(dto, WorkspaceListResponseDTO)
        self.assertEqual(len(dto.reports), 1)
        self.assertEqual(dto.reports[0].clinical_status, ClinicalStatus.AVAILABLE)

    def test_queue_awaiting_uses_pending_uploads(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        pending, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="Await"
        )
        mark_line_pending_upload(line=pending)

        dto = self.service.list_reports(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            params={"queue": "awaiting"},
        )
        self.assertEqual(len(dto.reports), 1)
        self.assertEqual(dto.reports[0].clinical_status, ClinicalStatus.AWAITING_REPORT)

    def test_queue_critical_empty(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        dto = self.service.list_reports(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            params={"queue": "critical"},
        )
        self.assertEqual(len(dto.reports), 0)

    def test_invalid_ordering_rejected(self):
        with self.assertRaises(WorkspaceListValidationError):
            self.service.list_reports(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                params={"ordering": "hack"},
            )

    def test_returns_dto_not_orm(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        dto = self.service.list_reports(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            params={},
        )
        payload = dto.to_dict()
        self.assertIn("reports", payload)
        self.assertIn("pagination", payload)
        self.assertIsInstance(payload["reports"][0]["id"], str)


class WorkspaceSummaryServiceTests(TestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.service = WorkspaceSummaryService()

    def test_summary_translates_counts(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        pending, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="Await"
        )
        mark_line_pending_upload(line=pending)

        dto = self.service.get_summary(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            params={},
        )
        self.assertIsInstance(dto, WorkspaceSummaryResponseDTO)
        self.assertEqual(dto.summary.reports_ready, 1)
        self.assertEqual(dto.summary.awaiting, 1)
        self.assertEqual(dto.summary.critical, 0)
