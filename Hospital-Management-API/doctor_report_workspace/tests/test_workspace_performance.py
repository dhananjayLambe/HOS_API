"""Milestone 11 — hard query budgets, N+1 guards, cursor stability."""

from __future__ import annotations

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.repositories.criteria import (
    WorkspaceListCriteria,
    WorkspaceScope,
)
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.search.criteria import WorkspaceSearchCriteria
from doctor_report_workspace.services.workspace.clinical_status_mapper import (
    ClinicalStatusMapper,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    mark_line_pending_upload,
)


class WorkspacePerformanceBudgetTests(TestCase):
    def setUp(self):
        self.repo = WorkspaceReportRepository()
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.scope = WorkspaceScope(doctor_id=self.doctor.id, clinic_id=self.clinic.id)
        for i in range(5):
            line, *_ = create_order_line(
                doctor=self.doctor,
                clinic=self.clinic,
                service_name=f"Perf{i}",
                patient_first=f"Perf{i}",
            )
            create_ready_report(line=line)
        pending, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            service_name="AwaitPerf",
            patient_first="Await",
        )
        mark_line_pending_upload(line=pending)
        self.sample_line, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="DetailPerf"
        )
        self.sample_report = create_ready_report(line=self.sample_line)

    def test_list_query_budget(self):
        with self.assertNumQueries(1):
            page = self.repo.find_reports(
                self.scope, WorkspaceListCriteria(), page_size=10
            )
            for row in page.rows:
                _ = row.source.order_test_line.order.patient_profile.first_name
                _ = row.source.order_test_line.service.name

    def test_search_query_budget(self):
        with self.assertNumQueries(1):
            page = self.repo.search_reports(
                self.scope, WorkspaceSearchCriteria(q="Perf", page_size=10)
            )
            for row in page.rows:
                _ = row.source.order_test_line.order.patient_profile.first_name
                _ = row.source.order_test_line.service.name
        self.assertGreaterEqual(len(page.rows), 1)

    def test_awaiting_query_budget(self):
        with self.assertNumQueries(1):
            page = self.repo.find_pending_uploads(
                self.scope, WorkspaceListCriteria(), page_size=10
            )
            for row in page.rows:
                _ = row.source.order.patient_profile.first_name
                _ = row.source.service.name
        self.assertGreaterEqual(len(page.rows), 1)

    def test_summary_counts_budget(self):
        # Two COUNT queries, no select_related joins on count paths.
        with self.assertNumQueries(2):
            ready = self.repo.count_reports(
                self.scope, WorkspaceListCriteria(clinical_ready_only=True)
            )
            awaiting = self.repo.count_pending_uploads(
                self.scope, WorkspaceListCriteria()
            )
        self.assertGreaterEqual(ready, 1)
        self.assertGreaterEqual(awaiting, 1)

    def test_detail_preview_download_budgets(self):
        with self.assertNumQueries(2):
            detail = self.repo.get_report_detail(self.scope, self.sample_report.id)
            self.assertIsNotNone(detail)
            _ = detail.patient.first_name
            _ = [a.id for a in detail.artifacts]

        with self.assertNumQueries(2):
            preview = self.repo.get_preview_artifact(self.scope, self.sample_report.id)
            self.assertIsNotNone(preview)
            _ = [a.id for a in preview.artifacts]

        with self.assertNumQueries(2):
            download = self.repo.get_download_artifact(self.scope, self.sample_report.id)
            self.assertIsNotNone(download)
            _ = [a.id for a in download.artifacts]

    def test_mapper_no_extra_sql_after_list(self):
        page = self.repo.find_reports(self.scope, WorkspaceListCriteria(), page_size=5)
        with CaptureQueriesContext(connection) as ctx:
            for row in page.rows:
                status = ClinicalStatusMapper.map_report(
                    report=row.source, has_artifact=row.has_artifact
                )
                WorkspaceResponseMapper.to_report_from_report_object(
                    row.source, clinical_status=status
                )
        self.assertEqual(len(ctx), 0)

    def test_cursor_no_duplicates_across_pages(self):
        for i in range(4):
            line, *_ = create_order_line(
                doctor=self.doctor,
                clinic=self.clinic,
                service_name=f"Cursor{i}",
            )
            create_ready_report(line=line)

        page1 = self.repo.find_reports(
            self.scope, WorkspaceListCriteria(), page_size=3, cursor=None
        )
        self.assertEqual(len(page1.rows), 3)
        self.assertIsNotNone(page1.next_cursor)
        page2 = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(),
            page_size=3,
            cursor=page1.next_cursor,
        )
        ids1 = {r.row_id for r in page1.rows}
        ids2 = {r.row_id for r in page2.rows}
        self.assertTrue(ids1.isdisjoint(ids2))
        self.assertGreaterEqual(len(ids2), 1)
