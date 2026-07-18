"""Repository tests for WorkspaceReportRepository.get_report_detail."""

from __future__ import annotations

import uuid

from django.test import TestCase
from django.utils import timezone

from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport

from doctor_report_workspace.domain.report_detail_aggregate import ReportDetailAggregate
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


class WorkspaceReportDetailRepositoryTests(TestCase):
    def setUp(self):
        self.repo = WorkspaceReportRepository()
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.scope = WorkspaceScope(doctor_id=self.doctor.id, clinic_id=self.clinic.id)

    def test_returns_hydrated_aggregate(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)

        agg = self.repo.get_report_detail(self.scope, report.id)
        self.assertIsInstance(agg, ReportDetailAggregate)
        self.assertEqual(str(agg.report.id), str(report.id))
        self.assertIsNotNone(agg.patient)
        self.assertIsNotNone(agg.encounter)
        self.assertIsNotNone(agg.consultation)
        self.assertIsNotNone(agg.service)
        self.assertTrue(agg.has_artifact)
        self.assertGreaterEqual(len(agg.artifacts), 1)
        self.assertIsNotNone(agg.ordered_at)
        self.assertIsNotNone(agg.uploaded_at)

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

        self.assertIsNone(self.repo.get_report_detail(other_scope, report.id))

    def test_unknown_id_returns_none(self):
        self.assertIsNone(self.repo.get_report_detail(self.scope, uuid.uuid4()))

    def test_soft_deleted_returns_none(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)
        DiagnosticTestReport.objects.filter(pk=report.pk).update(
            deleted_at=timezone.now()
        )
        self.assertIsNone(self.repo.get_report_detail(self.scope, report.id))

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
        self.assertIsNone(self.repo.get_report_detail(self.scope, old.id))

    def test_artifacts_load_order_by_uploaded_at(self):
        """Repository load order is uploaded_at ASC; presentation order is ArtifactService."""
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type="IMAGE",
            is_primary=False,
            is_active=True,
            file=pdf(b"%PDF-1.4 secondary"),
            original_filename="secondary.png",
            download_filename="secondary.png",
        )

        agg = self.repo.get_report_detail(self.scope, report.id)
        self.assertIsNotNone(agg)
        self.assertGreaterEqual(len(agg.artifacts), 2)
        timestamps = [a.uploaded_at for a in agg.artifacts]
        self.assertEqual(timestamps, sorted(timestamps))

    def test_query_budget_two_queries(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)

        with self.assertNumQueries(2):
            agg = self.repo.get_report_detail(self.scope, report.id)
            self.assertIsNotNone(agg)
            # Touch only aggregate slots — must not fire extra ORM.
            _ = agg.patient.first_name
            _ = agg.service.name
            _ = [a.id for a in agg.artifacts]
            _ = agg.ordered_at
            _ = agg.uploaded_at
