"""Repository integration tests for search_reports."""

from __future__ import annotations

from django.test import TestCase

from doctor_report_workspace.domain.rows import ReportRow
from doctor_report_workspace.repositories.criteria import WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.search.criteria import WorkspaceSearchCriteria
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class WorkspaceSearchRepositoryTests(TestCase):
    def setUp(self):
        self.repo = WorkspaceReportRepository()
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.scope = WorkspaceScope(doctor_id=self.doctor.id, clinic_id=self.clinic.id)
        other_user = UserFactory(username="91000006666")
        ensure_doctor_group(other_user)
        self.other_clinic = ClinicFactory()
        self.other_doctor = DoctorFactory(user=other_user, clinics=(self.other_clinic,))

    def test_search_by_patient_name(self):
        line, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="Searchable",
            patient_last="Patient",
        )
        create_ready_report(line=line)
        other, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="Other",
            patient_last="Person",
            service_name="Lipid",
        )
        create_ready_report(line=other)

        page = self.repo.search_reports(
            self.scope, WorkspaceSearchCriteria(q="Searchable")
        )
        self.assertEqual(len(page.rows), 1)
        self.assertIsInstance(page.rows[0], ReportRow)

    def test_search_by_report_number_prefix(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)
        page = self.repo.search_reports(
            self.scope, WorkspaceSearchCriteria(q=report.report_number[:4])
        )
        self.assertEqual(len(page.rows), 1)

    def test_search_by_test_name(self):
        line, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="UniqueCBCPanel"
        )
        create_ready_report(line=line)
        page = self.repo.search_reports(
            self.scope, WorkspaceSearchCriteria(q="UniqueCBC")
        )
        self.assertEqual(len(page.rows), 1)

    def test_search_by_identifier_prefix(self):
        line, _order, profile, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic
        )
        create_ready_report(line=line)
        public_id = profile.public_id
        page = self.repo.search_reports(
            self.scope, WorkspaceSearchCriteria(q=public_id[:4])
        )
        self.assertGreaterEqual(len(page.rows), 1)

    def test_doctor_isolation(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        other_line, *_ = create_order_line(
            doctor=self.other_doctor,
            clinic=self.other_clinic,
            service_name="SecretPanel",
        )
        create_ready_report(line=other_line)

        page = self.repo.search_reports(
            self.scope, WorkspaceSearchCriteria(q="SecretPanel")
        )
        self.assertEqual(len(page.rows), 0)

    def test_assert_num_queries_at_most_three(self):
        for i in range(3):
            line, *_ = create_order_line(
                doctor=self.doctor,
                clinic=self.clinic,
                service_name=f"SearchQ{i}",
            )
            create_ready_report(line=line)

        with self.assertNumQueries(1):
            page = self.repo.search_reports(
                self.scope, WorkspaceSearchCriteria(q="SearchQ", page_size=10)
            )
            for row in page.rows:
                _ = row.source.order_test_line.order.patient_profile.first_name
                _ = row.source.order_test_line.service.name
        self.assertGreaterEqual(len(page.rows), 1)
