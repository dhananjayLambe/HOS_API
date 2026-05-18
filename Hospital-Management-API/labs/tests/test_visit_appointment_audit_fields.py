"""
Audit timestamp fields and migration 0010 compatibility for LabVisitAppointment.
"""

from __future__ import annotations

from django.apps import apps
from django.db import connection
from django.test import TestCase

from labs.choices.workflow import AppointmentStatus
from labs.models import LabVisitAppointment
from labs.services.visit_workflow import (
    check_in_visit,
    complete_visit,
    confirm_visit,
    mark_no_show,
)
from labs.services.workflow_transitions import accept_assignment
from labs.tests.support.workflow_factories import lab_admin_client, lab_mode_assignment

AUDIT_TIMESTAMP_FIELDS = (
    "confirmed_at",
    "checked_in_at",
    "completed_at",
    "no_show_at",
    "status_changed_at",
    "cancelled_at",
)


class VisitAppointmentAuditMigrationTests(TestCase):
    def test_migration_0010_fields_on_model(self):
        model = apps.get_model("labs", "LabVisitAppointment")
        field_names = {f.name for f in model._meta.get_fields()}
        self.assertIn("confirmed_at", field_names)
        self.assertIn("no_show_at", field_names)
        self.assertIn("status_changed_at", field_names)

    def test_legacy_timestamp_fields_remain_on_model(self):
        model = apps.get_model("labs", "LabVisitAppointment")
        field_names = {f.name for f in model._meta.get_fields()}
        self.assertIn("checked_in_at", field_names)
        self.assertIn("completed_at", field_names)
        self.assertIn("cancelled_at", field_names)

    def test_audit_columns_exist_in_database(self):
        table = LabVisitAppointment._meta.db_table
        with connection.cursor() as cursor:
            columns = {
                col.name
                for col in connection.introspection.get_table_description(
                    cursor,
                    table,
                )
            }
        for name in AUDIT_TIMESTAMP_FIELDS:
            self.assertIn(
                name,
                columns,
                f"Expected column {name} on {table}",
            )


class VisitAppointmentTimestampCompatibilityTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def test_confirm_sets_confirmed_at_not_checked_in_or_completed(self):
        visit = self._pending_visit()
        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertIsNotNone(visit.confirmed_at)
        self.assertIsNone(visit.checked_in_at)
        self.assertIsNone(visit.completed_at)
        self.assertIsNone(visit.cancelled_at)
        self.assertIsNotNone(visit.status_changed_at)

    def test_check_in_sets_checked_in_at_preserves_confirmed_at(self):
        visit = self._pending_visit()
        confirmed_before = confirm_visit(visit_id=visit.id, lab_user=self.lab_user).confirmed_at
        visit = check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertIsNotNone(visit.checked_in_at)
        self.assertEqual(visit.confirmed_at, confirmed_before)
        self.assertIsNone(visit.completed_at)
        self.assertIsNone(visit.cancelled_at)

    def test_complete_sets_completed_at_preserves_prior_timestamps(self):
        visit = self._pending_visit()
        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        checked_before = check_in_visit(visit_id=visit.id, lab_user=self.lab_user).checked_in_at
        visit = complete_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertIsNotNone(visit.completed_at)
        self.assertEqual(visit.checked_in_at, checked_before)
        self.assertIsNone(visit.cancelled_at)
        self.assertEqual(visit.status, AppointmentStatus.COMPLETED)

    def test_no_show_sets_no_show_at_and_cancelled_at_for_timeline_compat(self):
        visit = self._pending_visit()
        visit = mark_no_show(visit_id=visit.id, lab_user=self.lab_user, reason="Absent")
        self.assertIsNotNone(visit.no_show_at)
        self.assertIsNotNone(visit.cancelled_at)
        self.assertIsNone(visit.checked_in_at)
        self.assertIsNone(visit.completed_at)
        self.assertEqual(visit.status, AppointmentStatus.NO_SHOW)
