"""Repository tests for WorkspaceReportRepository.get_download_artifact."""

from __future__ import annotations

import uuid

from django.test import TestCase
from django.utils import timezone

from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport

from doctor_report_workspace.domain.report_download_aggregate import ReportDownloadAggregate
from doctor_report_workspace.repositories.criteria import WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    pdf,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class WorkspaceReportDownloadRepositoryTests(TestCase):
    def setUp(self):
        self.repo = WorkspaceReportRepository()
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.scope = WorkspaceScope(doctor_id=self.doctor.id, clinic_id=self.clinic.id)

    def test_returns_aggregate_with_active_artifacts(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)

        agg = self.repo.get_download_artifact(self.scope, report.id)
        self.assertIsInstance(agg, ReportDownloadAggregate)
        self.assertEqual(str(agg.report.id), str(report.id))
        self.assertGreaterEqual(len(agg.artifacts), 1)
        self.assertTrue(all(a.is_active for a in agg.artifacts))

    def test_out_of_scope_returns_none(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)

        other_user = UserFactory(username=f"91{uuid.uuid4().int % 10**10:010d}")
        ensure_doctor_group(other_user)
        other_clinic = ClinicFactory()
        other_doctor = DoctorFactory(user=other_user, clinics=(other_clinic,))
        other_scope = WorkspaceScope(
            doctor_id=other_doctor.id, clinic_id=other_clinic.id
        )

        self.assertIsNone(self.repo.get_download_artifact(other_scope, report.id))

    def test_unknown_id_returns_none(self):
        self.assertIsNone(self.repo.get_download_artifact(self.scope, uuid.uuid4()))

    def test_superseded_head_returns_none(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        old = create_ready_report(line=line)
        DiagnosticTestReport.objects.create(
            order_test_line=line,
            status=ReportLifecycleStatus.READY,
            storage_mode=ReportStorageMode.FILE,
            revision_number=2,
            supersedes=old,
            report_number=f"R-{uuid.uuid4().hex[:6].upper()}",
            ready_at=timezone.now(),
            uploaded_at=timezone.now(),
        )
        self.assertIsNone(self.repo.get_download_artifact(self.scope, old.id))

    def test_inactive_artifacts_excluded(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)
        DiagnosticReportArtifact.objects.filter(report=report).update(is_active=False)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type="PDF",
            is_primary=True,
            is_active=True,
            file=pdf(b"%PDF-1.4 active"),
            original_filename="active.pdf",
            download_filename="active.pdf",
        )
        agg = self.repo.get_download_artifact(self.scope, report.id)
        self.assertIsNotNone(agg)
        self.assertEqual(len(agg.artifacts), 1)
        self.assertTrue(agg.artifacts[0].is_active)

    def test_query_budget_two_queries(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)

        with self.assertNumQueries(2):
            agg = self.repo.get_download_artifact(self.scope, report.id)
            self.assertIsNotNone(agg)
            _ = [a.id for a in agg.artifacts]
