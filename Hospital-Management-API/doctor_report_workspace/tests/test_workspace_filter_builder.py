"""Unit tests for WorkspaceFilterBuilder (no DB)."""

from __future__ import annotations

from datetime import date

from django.db.models import Q
from django.test import SimpleTestCase

from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.filters.workspace_filter_builder import WorkspaceFilterBuilder
from doctor_report_workspace.repositories.criteria import WorkspaceListCriteria


class WorkspaceFilterBuilderTests(SimpleTestCase):
    def test_status_available(self):
        criteria = WorkspaceListCriteria(status=ClinicalStatus.AVAILABLE)
        text = str(WorkspaceFilterBuilder.build_for_reports(criteria, doctor_id="d1"))
        self.assertIn("_has_artifact", text)

    def test_lab_branch_alias(self):
        criteria = WorkspaceListCriteria(lab_id="lab-uuid")
        text = str(WorkspaceFilterBuilder.build_for_reports(criteria, doctor_id="d1"))
        self.assertIn("branch_id", text)

    def test_date_range(self):
        criteria = WorkspaceListCriteria(
            date_from=date(2026, 7, 1),
            date_to=date(2026, 7, 17),
        )
        text = str(WorkspaceFilterBuilder.build_for_reports(criteria, doctor_id="d1"))
        self.assertIn("uploaded_at", text)
        self.assertIn("ready_at", text)

    def test_today_quick_filter(self):
        criteria = WorkspaceListCriteria(quick_filter="today")
        text = str(WorkspaceFilterBuilder.build_for_reports(criteria, doctor_id="d1"))
        self.assertIn("uploaded_at__date", text)

    def test_my_patients_uses_encounter_doctor(self):
        criteria = WorkspaceListCriteria(quick_filter="my_patients")
        text = str(
            WorkspaceFilterBuilder.build_for_reports(criteria, doctor_id="doc-123")
        )
        self.assertIn("encounter__doctor_id", text)
        self.assertIn("doc-123", text)

    def test_combined_status_and_lab(self):
        criteria = WorkspaceListCriteria(
            status=ClinicalStatus.UPDATED,
            lab_id="b1",
        )
        q = WorkspaceFilterBuilder.build_for_reports(criteria, doctor_id="d1")
        self.assertIsInstance(q, Q)
        text = str(q)
        self.assertIn("branch_id", text)
        self.assertIn("revision_number", text)

    def test_lines_reject_non_awaiting_status(self):
        criteria = WorkspaceListCriteria(status=ClinicalStatus.AVAILABLE)
        text = str(WorkspaceFilterBuilder.build_for_lines(criteria, doctor_id="d1"))
        self.assertIn("pk__in", text)

    def test_empty_criteria_is_empty_q(self):
        q = WorkspaceFilterBuilder.build_for_reports(
            WorkspaceListCriteria(), doctor_id="d1"
        )
        self.assertEqual(q, Q())
