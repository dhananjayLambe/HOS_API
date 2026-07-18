"""Service tests for WorkspaceSearchService."""

from __future__ import annotations

from django.test import TestCase

from doctor_report_workspace.dto import WorkspaceListResponseDTO
from doctor_report_workspace.services.workspace.workspace_search_service import (
    WorkspaceSearchService,
    WorkspaceSearchValidationError,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
)


class WorkspaceSearchServiceTests(TestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.service = WorkspaceSearchService()

    def test_requires_q(self):
        with self.assertRaises(WorkspaceSearchValidationError):
            self.service.search(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                params={},
            )

    def test_min_length(self):
        with self.assertRaises(WorkspaceSearchValidationError):
            self.service.search(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                params={"q": "a"},
            )

    def test_normalizes_and_returns_list_dto(self):
        line, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="Normalized",
            patient_last="Hit",
        )
        create_ready_report(line=line)
        dto = self.service.search(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            params={"q": "  Normalized   Hit "},
        )
        self.assertIsInstance(dto, WorkspaceListResponseDTO)
        self.assertEqual(len(dto.reports), 1)
        payload = dto.to_dict()
        self.assertIn("reports", payload)
        self.assertIn("pagination", payload)
