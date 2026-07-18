"""Repository-layer tests for WorkspaceReportRepository."""

from __future__ import annotations

from django.test import TestCase

from doctor_report_workspace.domain.rows import AwaitingRow, ReportRow
from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.repositories.criteria import WorkspaceListCriteria, WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    mark_line_pending_upload,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class WorkspaceReportRepositoryTests(TestCase):
    def setUp(self):
        self.repo = WorkspaceReportRepository()
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.scope = WorkspaceScope(doctor_id=self.doctor.id, clinic_id=self.clinic.id)
        self.other_user = UserFactory(username="91000009999")
        ensure_doctor_group(self.other_user)
        self.other_clinic = ClinicFactory()
        self.other_doctor = DoctorFactory(user=self.other_user, clinics=(self.other_clinic,))

    def test_find_reports_returns_report_rows_scoped_to_doctor(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        other_line, *_ = create_order_line(
            doctor=self.other_doctor, clinic=self.other_clinic, service_name="Other"
        )
        create_ready_report(line=other_line)

        page = self.repo.find_reports(self.scope, WorkspaceListCriteria())
        self.assertEqual(len(page.rows), 1)
        self.assertIsInstance(page.rows[0], ReportRow)
        self.assertTrue(page.rows[0].has_artifact)

    def test_find_pending_uploads_returns_awaiting_rows(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        mark_line_pending_upload(line=line, minutes_ago=60)

        page = self.repo.find_pending_uploads(self.scope, WorkspaceListCriteria())
        self.assertEqual(len(page.rows), 1)
        self.assertIsInstance(page.rows[0], AwaitingRow)

    def test_search_by_patient_name(self):
        line, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="UniqueSearch",
            patient_last="Alpha",
        )
        create_ready_report(line=line)
        line2, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="Other",
            patient_last="Beta",
            service_name="Lipid",
        )
        create_ready_report(line=line2)

        page = self.repo.find_reports(
            self.scope, WorkspaceListCriteria(q="UniqueSearch")
        )
        self.assertEqual(len(page.rows), 1)

    def test_filter_by_patient_id(self):
        line, _order, profile, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic
        )
        create_ready_report(line=line)
        line2, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="X"
        )
        create_ready_report(line=line2)

        page = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(patient_id=str(profile.id)),
        )
        self.assertEqual(len(page.rows), 1)

    def test_clinical_ready_only_filter(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line, with_artifact=True)
        pending_line, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="PendingSvc"
        )
        create_ready_report(line=pending_line, with_artifact=False)
        # Force pending-ish lifecycle without artifact
        from diagnostics_engine.models.reports import DiagnosticTestReport
        from diagnostics_engine.models.choices import ReportLifecycleStatus

        DiagnosticTestReport.objects.filter(order_test_line=pending_line).update(
            status=ReportLifecycleStatus.PENDING,
            ready_at=None,
        )

        page = self.repo.find_reports(
            self.scope, WorkspaceListCriteria(clinical_ready_only=True)
        )
        self.assertEqual(len(page.rows), 1)

    def test_cursor_pagination(self):
        for i in range(3):
            line, *_ = create_order_line(
                doctor=self.doctor,
                clinic=self.clinic,
                service_name=f"Test {i}",
            )
            create_ready_report(line=line)

        page1 = self.repo.find_reports(
            self.scope, WorkspaceListCriteria(), page_size=2, cursor=None
        )
        self.assertEqual(len(page1.rows), 2)
        self.assertIsNotNone(page1.next_cursor)

        page2 = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(),
            page_size=2,
            cursor=page1.next_cursor,
        )
        self.assertEqual(len(page2.rows), 1)
        ids1 = {r.row_id for r in page1.rows}
        ids2 = {r.row_id for r in page2.rows}
        self.assertTrue(ids1.isdisjoint(ids2))

    def test_count_methods(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        pending, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="Await"
        )
        mark_line_pending_upload(line=pending)

        ready = self.repo.count_reports(
            self.scope, WorkspaceListCriteria(clinical_ready_only=True)
        )
        awaiting = self.repo.count_pending_uploads(self.scope, WorkspaceListCriteria())
        self.assertEqual(ready, 1)
        self.assertEqual(awaiting, 1)

    def test_assert_num_queries_bounded(self):
        for i in range(5):
            line, *_ = create_order_line(
                doctor=self.doctor,
                clinic=self.clinic,
                service_name=f"Q{i}",
            )
            create_ready_report(line=line)

        # Prefetch/select_related must prevent N+1 when touching related fields.
        with self.assertNumQueries(1):
            page = self.repo.find_reports(
                self.scope, WorkspaceListCriteria(), page_size=5
            )
            for row in page.rows:
                _ = row.source.order_test_line.order.patient_profile.first_name
                _ = row.source.order_test_line.service.name
