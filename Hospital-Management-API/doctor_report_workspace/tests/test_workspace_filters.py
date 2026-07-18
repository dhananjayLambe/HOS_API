"""Integration tests for workspace filter engine (SQL composition)."""

from __future__ import annotations

import uuid
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticTestReport
from labs.models import LabBranch, LabOrganization, LabType, RegistrationStatus

from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.repositories.criteria import WorkspaceListCriteria, WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.search.criteria import WorkspaceSearchCriteria
from doctor_report_workspace.services.workspace.workspace_list_service import (
    WorkspaceListService,
    WorkspaceListValidationError,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


def _make_branch(*, name: str = "Main") -> LabBranch:
    org = LabOrganization.objects.create(
        organization_name=f"Org {name}",
        display_name=f"Org {name}",
        organization_code=f"ORG-{uuid.uuid4().hex[:8]}",
        slug=f"org-{uuid.uuid4().hex[:8]}",
        lab_type=LabType.PATHOLOGY_LAB,
        owner_name="Owner",
        primary_contact_number="9999999999",
        registration_status=RegistrationStatus.APPROVED,
        is_verified=True,
        onboarding_completed=True,
        is_active_for_orders=True,
    )
    return LabBranch.objects.create(
        organization=org,
        branch_name=name,
        branch_code=f"BR-{uuid.uuid4().hex[:8]}",
        is_active=True,
        is_active_for_orders=True,
    )


class WorkspaceFilterRepositoryTests(TestCase):
    def setUp(self):
        self.repo = WorkspaceReportRepository()
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.scope = WorkspaceScope(doctor_id=self.doctor.id, clinic_id=self.clinic.id)

    def test_filter_status_available(self):
        ready, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=ready, with_artifact=True)
        pending, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="Pend"
        )
        create_ready_report(line=pending, with_artifact=False)
        DiagnosticTestReport.objects.filter(order_test_line=pending).update(
            status=ReportLifecycleStatus.PENDING,
            ready_at=None,
        )

        page = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(status=ClinicalStatus.AVAILABLE),
        )
        self.assertEqual(len(page.rows), 1)

    def test_filter_branch_alias(self):
        branch_a = _make_branch(name="A")
        branch_b = _make_branch(name="B")
        line_a, order_a, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="AtA"
        )
        order_a.branch = branch_a
        order_a.save(update_fields=["branch"])
        create_ready_report(line=line_a)

        line_b, order_b, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="AtB"
        )
        order_b.branch = branch_b
        order_b.save(update_fields=["branch"])
        create_ready_report(line=line_b)

        page = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(lab_id=str(branch_a.id)),
        )
        self.assertEqual(len(page.rows), 1)
        self.assertEqual(
            str(page.rows[0].source.order_test_line.order.branch_id),
            str(branch_a.id),
        )

    def test_filter_date_range(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)
        old = timezone.now() - timedelta(days=10)
        DiagnosticTestReport.objects.filter(pk=report.pk).update(
            uploaded_at=old, ready_at=old
        )

        today = timezone.localdate()
        page = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(
                date_from=today - timedelta(days=2),
                date_to=today,
            ),
        )
        self.assertEqual(len(page.rows), 0)

        page_all = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(
                date_from=today - timedelta(days=30),
                date_to=today,
            ),
        )
        self.assertEqual(len(page_all.rows), 1)

    def test_quick_filter_today(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)
        DiagnosticTestReport.objects.filter(pk=report.pk).update(
            uploaded_at=timezone.now() - timedelta(days=3),
            ready_at=timezone.now() - timedelta(days=3),
        )
        line2, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="Today"
        )
        create_ready_report(line=line2)

        page = self.repo.find_reports(
            self.scope, WorkspaceListCriteria(quick_filter="today")
        )
        self.assertEqual(len(page.rows), 1)

    def test_my_patients_encounter_doctor_only(self):
        mine, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=mine)

        other_user = UserFactory(username=f"91{uuid.uuid4().int % 10**10:010d}")
        ensure_doctor_group(other_user)
        other_doctor = DoctorFactory(user=other_user, clinics=(self.clinic,))
        line, order, *_ = create_order_line(
            doctor=other_doctor,
            clinic=self.clinic,
            service_name="OrderDocMine",
        )
        # Visible via order.doctor scope OR, but not encounter doctor.
        order.doctor = self.doctor
        order.save(update_fields=["doctor"])
        create_ready_report(line=line)

        default = self.repo.find_reports(self.scope, WorkspaceListCriteria())
        self.assertEqual(len(default.rows), 2)

        mine_only = self.repo.find_reports(
            self.scope, WorkspaceListCriteria(quick_filter="my_patients")
        )
        self.assertEqual(len(mine_only.rows), 1)
        self.assertEqual(
            str(mine_only.rows[0].source.order_test_line.order.encounter.doctor_id),
            str(self.doctor.id),
        )

    def test_search_composes_with_filters(self):
        line, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="FilterAlpha",
            patient_last="Zed",
        )
        create_ready_report(line=line)
        line2, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="FilterBeta",
            patient_last="Zed",
            service_name="Other",
        )
        create_ready_report(line=line2)

        page = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(q="FilterAlpha", status=ClinicalStatus.AVAILABLE),
        )
        self.assertEqual(len(page.rows), 1)

        search_page = self.repo.search_reports(
            self.scope,
            WorkspaceSearchCriteria(
                q="Filter",
                status=ClinicalStatus.AVAILABLE,
            ),
        )
        self.assertEqual(len(search_page.rows), 2)

    def test_filter_isolation_across_doctors(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)

        other_user = UserFactory(username=f"91{uuid.uuid4().int % 10**10:010d}")
        ensure_doctor_group(other_user)
        other_clinic = ClinicFactory()
        other_doctor = DoctorFactory(user=other_user, clinics=(other_clinic,))
        other_line, *_ = create_order_line(
            doctor=other_doctor, clinic=other_clinic, service_name="Secret"
        )
        create_ready_report(line=other_line)

        page = self.repo.find_reports(
            self.scope,
            WorkspaceListCriteria(status=ClinicalStatus.AVAILABLE),
        )
        self.assertEqual(len(page.rows), 1)

    def test_filters_bounded_queries(self):
        branch = _make_branch()
        for i in range(4):
            line, order, *_ = create_order_line(
                doctor=self.doctor,
                clinic=self.clinic,
                service_name=f"F{i}",
            )
            order.branch = branch
            order.save(update_fields=["branch"])
            create_ready_report(line=line)

        with self.assertNumQueries(1):
            page = self.repo.find_reports(
                self.scope,
                WorkspaceListCriteria(
                    lab_id=str(branch.id),
                    status=ClinicalStatus.AVAILABLE,
                    quick_filter="my_patients",
                ),
                page_size=10,
            )
            for row in page.rows:
                _ = row.source.order_test_line.order.patient_profile.first_name


class WorkspaceFilterServiceTests(TestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.service = WorkspaceListService()

    def test_inverted_date_range_rejected(self):
        with self.assertRaises(WorkspaceListValidationError):
            self.service.list_reports(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                params={"date_from": "2026-07-17", "date_to": "2026-07-01"},
            )

    def test_non_uuid_lab_rejected(self):
        with self.assertRaises(WorkspaceListValidationError):
            self.service.list_reports(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                params={"lab": "Main Lab Name"},
            )

    def test_invalid_status_rejected(self):
        with self.assertRaises(WorkspaceListValidationError):
            self.service.list_reports(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                params={"status": "READY"},
            )


class WorkspaceFilterAPITests(APITestCase):
    def setUp(self):
        self.list_url = reverse("doctor_report_workspace:workspace-list")
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()

    def test_inverted_dates_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            self.list_url,
            {
                "clinic_id": str(self.clinic.id),
                "date_from": "2026-07-17",
                "date_to": "2026-07-01",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_filter_result_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            self.list_url,
            {
                "clinic_id": str(self.clinic.id),
                "lab": str(uuid.uuid4()),
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["data"]["reports"], [])

    def test_status_filter_ok(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            self.list_url,
            {
                "clinic_id": str(self.clinic.id),
                "status": ClinicalStatus.AVAILABLE,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json()["data"]["reports"]), 1)
