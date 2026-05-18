"""
Unit and integration tests for labs.services.visit_workflow (items 17–24).
"""

from __future__ import annotations

import copy
import threading
from datetime import timedelta

from django.test import TestCase, TransactionTestCase

from labs.choices.workflow import AppointmentStatus
from labs.models import ACTIVE_TEST_EXECUTION_STATUSES, LabOrderTestExecution, LabVisitAppointment
from labs.services.test_execution_provisioning import ensure_test_executions
from labs.services.visit_workflow import (
    ALLOWED_TRANSITIONS,
    TERMINAL_STATUSES,
    VisitNotFoundError,
    VisitWorkflowError,
    allowed_actions_for_status,
    check_in_visit,
    complete_visit,
    confirm_visit,
    ensure_not_terminal,
    get_visit_for_lab_user,
    mark_no_show,
    reschedule_visit,
    validate_transition,
    workflow_hint_for_status,
)
from labs.services.workflow_transitions import accept_assignment
from labs.tests.support.visit_workflow_assertions import (
    assert_events_ordered,
    assert_status_contract,
)
from labs.tests.support.workflow_factories import lab_admin_client, lab_mode_assignment

# ---------------------------------------------------------------------------
# 17. Transition validation unit tests
# ---------------------------------------------------------------------------


class VisitTransitionValidationTests(TestCase):
    def test_allowed_transitions(self):
        for current, target in (
            (AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED),
            (AppointmentStatus.PENDING, AppointmentStatus.NO_SHOW),
            (AppointmentStatus.PENDING, AppointmentStatus.RESCHEDULED),
            (AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN),
            (AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW),
            (AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED),
            (AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED),
            (AppointmentStatus.CHECKED_IN, AppointmentStatus.NO_SHOW),
            (AppointmentStatus.RESCHEDULED, AppointmentStatus.CONFIRMED),
            (AppointmentStatus.RESCHEDULED, AppointmentStatus.NO_SHOW),
        ):
            validate_transition(current_status=current, target_status=target)

    def test_rejected_transitions(self):
        for current, target in (
            (AppointmentStatus.PENDING, AppointmentStatus.COMPLETED),
            (AppointmentStatus.PENDING, AppointmentStatus.CHECKED_IN),
            (AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED),
            (AppointmentStatus.CONFIRMED, AppointmentStatus.CONFIRMED),
            (AppointmentStatus.CHECKED_IN, AppointmentStatus.RESCHEDULED),
            (AppointmentStatus.CHECKED_IN, AppointmentStatus.CONFIRMED),
            (AppointmentStatus.COMPLETED, AppointmentStatus.PENDING),
            (AppointmentStatus.NO_SHOW, AppointmentStatus.CONFIRMED),
            (AppointmentStatus.CANCELLED, AppointmentStatus.PENDING),
        ):
            with self.assertRaises(VisitWorkflowError):
                validate_transition(current_status=current, target_status=target)

    def test_terminal_states_have_empty_outbound_sets(self):
        for status in TERMINAL_STATUSES:
            self.assertEqual(ALLOWED_TRANSITIONS[status], set())


# ---------------------------------------------------------------------------
# 18. Terminal-state immutability tests
# ---------------------------------------------------------------------------


class VisitTerminalImmutabilityTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def _visit_at_status(self, status: str) -> LabVisitAppointment:
        visit = self._pending_visit()
        if status == AppointmentStatus.PENDING:
            return visit
        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        if status == AppointmentStatus.CONFIRMED:
            return visit
        visit = check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        if status == AppointmentStatus.CHECKED_IN:
            return visit
        return complete_visit(visit_id=visit.id, lab_user=self.lab_user)

    def test_ensure_not_terminal_rejects_all_terminals(self):
        for status in TERMINAL_STATUSES:
            with self.assertRaises(VisitWorkflowError):
                ensure_not_terminal(status)

    def test_completed_visit_rejects_confirm(self):
        visit = self._visit_at_status(AppointmentStatus.COMPLETED)
        with self.assertRaises(VisitWorkflowError):
            confirm_visit(visit_id=visit.id, lab_user=self.lab_user)

    def test_completed_visit_rejects_check_in(self):
        visit = self._visit_at_status(AppointmentStatus.COMPLETED)
        with self.assertRaises(VisitWorkflowError):
            check_in_visit(visit_id=visit.id, lab_user=self.lab_user)

    def test_no_show_visit_rejects_reschedule(self):
        visit = self._pending_visit()
        mark_no_show(visit_id=visit.id, lab_user=self.lab_user)
        with self.assertRaises(VisitWorkflowError):
            reschedule_visit(visit_id=visit.id, lab_user=self.lab_user)

    def test_cancelled_legacy_row_rejects_confirm(self):
        visit = self._pending_visit()
        visit.status = AppointmentStatus.CANCELLED
        visit.save(update_fields=["status", "updated_at"])
        with self.assertRaises(VisitWorkflowError):
            confirm_visit(visit_id=visit.id, lab_user=self.lab_user)


# ---------------------------------------------------------------------------
# 19. workflow_events append-only tests
# ---------------------------------------------------------------------------


class VisitWorkflowEventsTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def test_events_append_only_across_lifecycle(self):
        visit = self._pending_visit()
        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        first = copy.deepcopy(visit.metadata["workflow_events"][0])

        visit = check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        events = visit.metadata["workflow_events"]
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0], first)

        visit = complete_visit(visit_id=visit.id, lab_user=self.lab_user)
        events = visit.metadata["workflow_events"]
        self.assertEqual(len(events), 3)
        self.assertEqual(events[0], first)
        self.assertEqual(events[1]["event"], "checked_in")

    def test_event_schema_on_confirm(self):
        visit = self._pending_visit()
        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        event = visit.metadata["workflow_events"][0]
        self.assertEqual(event["event"], "confirmed")
        self.assertEqual(event["previous_status"], AppointmentStatus.PENDING)
        self.assertEqual(event["to_status"], AppointmentStatus.CONFIRMED)
        self.assertIn("timestamp", event)
        self.assertEqual(event["performed_by_user_id"], str(self.lab_user.user_id))

    def test_no_show_event_includes_reason(self):
        visit = self._pending_visit()
        visit = mark_no_show(visit_id=visit.id, lab_user=self.lab_user, reason="Absent")
        event = visit.metadata["workflow_events"][0]
        self.assertEqual(event["event"], "no_show")
        self.assertEqual(event["reason"], "Absent")

    def test_reschedule_event_includes_slot_fields(self):
        visit = self._pending_visit()
        new_date = visit.appointment_date + timedelta(days=3)
        visit = reschedule_visit(
            visit_id=visit.id,
            lab_user=self.lab_user,
            appointment_date=new_date,
            appointment_slot="10-12",
        )
        event = visit.metadata["workflow_events"][0]
        self.assertEqual(event["event"], "rescheduled")
        self.assertEqual(event["appointment_date"], new_date.isoformat())
        self.assertEqual(event["appointment_slot"], "10-12")


# ---------------------------------------------------------------------------
# 20. Audit timestamp tests
# ---------------------------------------------------------------------------


class VisitAuditTimestampTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def test_status_changed_at_updates_on_every_transition(self):
        visit = self._pending_visit()
        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        t1 = visit.status_changed_at
        visit = check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        t2 = visit.status_changed_at
        visit = complete_visit(visit_id=visit.id, lab_user=self.lab_user)
        t3 = visit.status_changed_at
        self.assertIsNotNone(t1)
        self.assertIsNotNone(t2)
        self.assertIsNotNone(t3)
        self.assertGreaterEqual(t2, t1)
        self.assertGreaterEqual(t3, t2)

    def test_confirmed_at_set_once_on_reconfirm_path(self):
        visit = self._pending_visit()
        visit = reschedule_visit(visit_id=visit.id, lab_user=self.lab_user)
        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        first_confirmed = visit.confirmed_at
        visit = reschedule_visit(visit_id=visit.id, lab_user=self.lab_user)
        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertEqual(visit.confirmed_at, first_confirmed)

    def test_no_show_timestamps(self):
        visit = self._pending_visit()
        visit = mark_no_show(visit_id=visit.id, lab_user=self.lab_user)
        self.assertIsNotNone(visit.no_show_at)
        self.assertIsNotNone(visit.status_changed_at)
        self.assertIsNotNone(visit.cancelled_at)


# ---------------------------------------------------------------------------
# 21. allowed_actions mapping tests
# ---------------------------------------------------------------------------


class VisitAllowedActionsTests(TestCase):
    def test_all_status_mappings(self):
        self.assertEqual(
            allowed_actions_for_status(AppointmentStatus.PENDING),
            ["confirm", "mark_no_show", "reschedule"],
        )
        self.assertEqual(
            allowed_actions_for_status(AppointmentStatus.CONFIRMED),
            ["check_in", "mark_no_show", "reschedule"],
        )
        self.assertEqual(
            allowed_actions_for_status(AppointmentStatus.CHECKED_IN),
            ["complete", "mark_no_show"],
        )
        self.assertEqual(
            allowed_actions_for_status(AppointmentStatus.RESCHEDULED),
            ["confirm", "mark_no_show"],
        )
        self.assertEqual(allowed_actions_for_status(AppointmentStatus.COMPLETED), [])
        self.assertEqual(allowed_actions_for_status(AppointmentStatus.NO_SHOW), [])
        self.assertEqual(allowed_actions_for_status(AppointmentStatus.CANCELLED), [])

    def test_unknown_status_returns_empty_list(self):
        self.assertEqual(allowed_actions_for_status("UNKNOWN"), [])


# ---------------------------------------------------------------------------
# 22. workflow_hint mapping tests
# ---------------------------------------------------------------------------


class VisitWorkflowHintTests(TestCase):
    def test_all_status_hints(self):
        expected = {
            AppointmentStatus.PENDING: "Awaiting appointment confirmation",
            AppointmentStatus.CONFIRMED: "Patient appointment confirmed",
            AppointmentStatus.CHECKED_IN: "Patient checked in",
            AppointmentStatus.COMPLETED: "Appointment completed",
            AppointmentStatus.NO_SHOW: "Patient did not arrive",
            AppointmentStatus.CANCELLED: "Appointment cancelled",
            AppointmentStatus.RESCHEDULED: "Confirm rescheduled slot",
        }
        for status, hint in expected.items():
            self.assertEqual(workflow_hint_for_status(status), hint)

    def test_unknown_status_fallback(self):
        self.assertEqual(workflow_hint_for_status("UNKNOWN"), "Review appointment")


# ---------------------------------------------------------------------------
# 23. Branch isolation tests
# ---------------------------------------------------------------------------


class VisitBranchIsolationTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, self.org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def test_get_visit_for_lab_user_cross_branch_raises(self):
        visit = self._pending_visit()
        _c, other_lu, _other_br, _org = lab_admin_client(branch_name="Other Branch")
        with self.assertRaises(VisitNotFoundError):
            get_visit_for_lab_user(visit_id=visit.id, lab_user=other_lu)

    def test_confirm_cross_branch_raises(self):
        visit = self._pending_visit()
        _c, other_lu, _other_br, _org = lab_admin_client(branch_name="Other Branch")
        with self.assertRaises(VisitNotFoundError):
            confirm_visit(visit_id=visit.id, lab_user=other_lu)

    def test_check_in_cross_branch_raises(self):
        visit = self._pending_visit()
        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        _c, other_lu, _other_br, _org = lab_admin_client(branch_name="Other Branch")
        with self.assertRaises(VisitNotFoundError):
            check_in_visit(visit_id=visit.id, lab_user=other_lu)


# ---------------------------------------------------------------------------
# 24. Concurrency tests
# ---------------------------------------------------------------------------


class VisitWorkflowConcurrencyTests(TransactionTestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, self.org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def _run_concurrent(self, visit_id, fn):
        barrier = threading.Barrier(2)
        results: list = []

        def attempt():
            barrier.wait()
            try:
                results.append(fn())
            except VisitWorkflowError as exc:
                results.append(exc)

        t1 = threading.Thread(target=attempt)
        t2 = threading.Thread(target=attempt)
        t1.start()
        t2.start()
        t1.join()
        t2.join()
        return results

    def test_concurrent_double_confirm_one_succeeds(self):
        visit = self._pending_visit()
        results = self._run_concurrent(
            visit.id,
            lambda: confirm_visit(visit_id=visit.id, lab_user=self.lab_user),
        )
        successes = [r for r in results if not isinstance(r, Exception)]
        errors = [r for r in results if isinstance(r, VisitWorkflowError)]
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(errors), 1)
        visit.refresh_from_db()
        self.assertEqual(visit.status, AppointmentStatus.CONFIRMED)

    def test_concurrent_double_check_in_one_succeeds(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        order = visit.diagnostic_order
        line_count = order.test_lines.count()
        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        results = self._run_concurrent(
            visit.id,
            lambda: check_in_visit(visit_id=visit.id, lab_user=self.lab_user),
        )
        successes = [r for r in results if not isinstance(r, Exception)]
        errors = [r for r in results if isinstance(r, VisitWorkflowError)]
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(errors), 1)
        visit.refresh_from_db()
        self.assertEqual(visit.status, AppointmentStatus.CHECKED_IN)
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            line_count,
        )
        active_count = LabOrderTestExecution.objects.filter(
            assignment=assignment,
            execution_status__in=ACTIVE_TEST_EXECUTION_STATUSES,
        ).count()
        self.assertEqual(active_count, line_count)
        active_rows = LabOrderTestExecution.objects.filter(
            assignment=assignment,
            execution_status__in=ACTIVE_TEST_EXECUTION_STATUSES,
        )
        self.assertEqual(
            active_rows.values("test_line_id").distinct().count(),
            line_count,
        )

    def test_concurrent_double_complete_one_succeeds(self):
        visit = self._pending_visit()
        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        results = self._run_concurrent(
            visit.id,
            lambda: complete_visit(visit_id=visit.id, lab_user=self.lab_user),
        )
        successes = [r for r in results if not isinstance(r, Exception)]
        errors = [r for r in results if isinstance(r, VisitWorkflowError)]
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(errors), 1)
        visit.refresh_from_db()
        self.assertEqual(visit.status, AppointmentStatus.COMPLETED)


# ---------------------------------------------------------------------------
# Execution provisioning (CHECKED_IN only)
# ---------------------------------------------------------------------------


class VisitWorkflowProvisioningTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def _execution_count(self, assignment) -> int:
        return LabOrderTestExecution.objects.filter(assignment=assignment).count()

    def test_check_in_provisions_one_execution_per_test_line(self):
        from labs.choices.workflow import TestExecutionType

        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        order = visit.diagnostic_order
        line_count = order.test_lines.count()

        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertEqual(self._execution_count(assignment), 0)

        visit = check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertEqual(visit.status, AppointmentStatus.CHECKED_IN)
        self.assertEqual(self._execution_count(assignment), line_count)

        rows = LabOrderTestExecution.objects.filter(assignment=assignment)
        self.assertEqual(rows.count(), line_count)
        for row in rows:
            self.assertEqual(row.visit_appointment_id, visit.id)
            self.assertIsNone(row.collection_request_id)
            self.assertEqual(row.execution_type, TestExecutionType.BRANCH_VISIT)
            self.assertEqual(row.metadata.get("execution_source"), "branch_visit")
            self.assertEqual(row.lab_branch_id, assignment.lab_branch_id)

    def test_ensure_test_executions_idempotent_after_check_in(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        order = visit.diagnostic_order
        line_count = order.test_lines.count()

        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        check_in_visit(visit_id=visit.id, lab_user=self.lab_user)

        count_after_check_in = self._execution_count(assignment)
        self.assertEqual(count_after_check_in, line_count)

        second = ensure_test_executions(
            assignment=assignment,
            visit_appointment=visit,
        )
        self.assertEqual(second, [])
        self.assertEqual(self._execution_count(assignment), count_after_check_in)
        active_count = LabOrderTestExecution.objects.filter(
            assignment=assignment,
            execution_status__in=ACTIVE_TEST_EXECUTION_STATUSES,
        ).count()
        self.assertEqual(active_count, line_count)

    def test_confirm_does_not_provision_executions(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertEqual(self._execution_count(assignment), 0)

    def test_complete_does_not_provision_executions(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        count_after_check_in = self._execution_count(assignment)
        self.assertGreater(count_after_check_in, 0)
        complete_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertEqual(self._execution_count(assignment), count_after_check_in)


# ---------------------------------------------------------------------------
# Lifecycle integration (happy path, no-show matrix, RESCHEDULED)
# ---------------------------------------------------------------------------


class VisitWorkflowLifecycleTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        return LabVisitAppointment.objects.get(diagnostic_order=order)

    def _execution_count(self, assignment) -> int:
        return LabOrderTestExecution.objects.filter(assignment=assignment).count()

    def test_full_visit_workflow_lifecycle(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        line_count = visit.diagnostic_order.test_lines.count()

        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        assert_status_contract(
            self,
            visit,
            expected_status=AppointmentStatus.CONFIRMED,
            expected_actions=["check_in", "mark_no_show", "reschedule"],
            expected_hint="Patient appointment confirmed",
        )
        self.assertIsNotNone(visit.confirmed_at)
        self.assertIsNone(visit.checked_in_at)
        self.assertIsNone(visit.completed_at)
        self.assertIsNotNone(visit.status_changed_at)
        assert_events_ordered(self, visit.metadata["workflow_events"], expected_len=1)
        self.assertEqual(visit.metadata["workflow_events"][0]["event"], "confirmed")
        self.assertEqual(self._execution_count(assignment), 0)

        confirmed_at = visit.confirmed_at
        visit = check_in_visit(visit_id=visit.id, lab_user=self.lab_user)
        assert_status_contract(
            self,
            visit,
            expected_status=AppointmentStatus.CHECKED_IN,
            expected_actions=["complete", "mark_no_show"],
            expected_hint="Patient checked in",
        )
        self.assertIsNotNone(visit.checked_in_at)
        self.assertEqual(visit.confirmed_at, confirmed_at)
        self.assertIsNone(visit.completed_at)
        assert_events_ordered(self, visit.metadata["workflow_events"], expected_len=2)
        self.assertEqual(visit.metadata["workflow_events"][1]["event"], "checked_in")
        self.assertEqual(self._execution_count(assignment), line_count)

        checked_in_at = visit.checked_in_at
        visit = complete_visit(visit_id=visit.id, lab_user=self.lab_user)
        assert_status_contract(
            self,
            visit,
            expected_status=AppointmentStatus.COMPLETED,
            expected_actions=[],
            expected_hint="Appointment completed",
        )
        self.assertIsNotNone(visit.completed_at)
        self.assertEqual(visit.checked_in_at, checked_in_at)
        self.assertEqual(visit.confirmed_at, confirmed_at)
        assert_events_ordered(self, visit.metadata["workflow_events"], expected_len=3)
        self.assertEqual(visit.metadata["workflow_events"][2]["event"], "completed")
        self.assertEqual(self._execution_count(assignment), line_count)

        with self.assertRaises(VisitWorkflowError):
            confirm_visit(visit_id=visit.id, lab_user=self.lab_user)

    def test_no_show_workflow_lifecycle(self):
        cases = (
            (lambda v: v, AppointmentStatus.PENDING, False),
            (
                lambda v: confirm_visit(visit_id=v.id, lab_user=self.lab_user),
                AppointmentStatus.CONFIRMED,
                False,
            ),
            (
                lambda v: check_in_visit(
                    visit_id=confirm_visit(visit_id=v.id, lab_user=self.lab_user).id,
                    lab_user=self.lab_user,
                ),
                AppointmentStatus.CHECKED_IN,
                True,
            ),
            (
                lambda v: reschedule_visit(visit_id=v.id, lab_user=self.lab_user),
                AppointmentStatus.RESCHEDULED,
                False,
            ),
        )
        for prepare, prior_status, checked_in_before_no_show in cases:
            with self.subTest(prior_status=prior_status):
                visit = self._pending_visit()
                assignment = visit.diagnostic_order.lab_assignment
                prepared = prepare(visit)
                if checked_in_before_no_show:
                    visit = prepared
                count_before_no_show = self._execution_count(assignment)
                visit = mark_no_show(
                    visit_id=visit.id,
                    lab_user=self.lab_user,
                    reason=f"Absent from {prior_status}",
                )
                assert_status_contract(
                    self,
                    visit,
                    expected_status=AppointmentStatus.NO_SHOW,
                    expected_actions=[],
                    expected_hint="Patient did not arrive",
                )
                self.assertIsNotNone(visit.no_show_at)
                self.assertIsNotNone(visit.cancelled_at)
                self.assertIsNotNone(visit.status_changed_at)
                events = visit.metadata["workflow_events"]
                assert_events_ordered(self, events)
                last = events[-1]
                self.assertEqual(last["event"], "no_show")
                self.assertEqual(last["previous_status"], prior_status)
                self.assertEqual(last["reason"], f"Absent from {prior_status}")
                if checked_in_before_no_show:
                    self.assertGreater(count_before_no_show, 0)
                else:
                    self.assertEqual(count_before_no_show, 0)
                self.assertEqual(self._execution_count(assignment), count_before_no_show)
                with self.assertRaises(VisitWorkflowError):
                    reschedule_visit(visit_id=visit.id, lab_user=self.lab_user)

    def test_rescheduled_operational_behavior(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        visit = reschedule_visit(visit_id=visit.id, lab_user=self.lab_user)
        assert_status_contract(
            self,
            visit,
            expected_status=AppointmentStatus.RESCHEDULED,
            expected_actions=["confirm", "mark_no_show"],
            expected_hint="Confirm rescheduled slot",
        )
        self.assertEqual(self._execution_count(assignment), 0)

        visit = confirm_visit(visit_id=visit.id, lab_user=self.lab_user)
        self.assertEqual(visit.status, AppointmentStatus.CONFIRMED)
        visit = reschedule_visit(visit_id=visit.id, lab_user=self.lab_user)
        visit = mark_no_show(visit_id=visit.id, lab_user=self.lab_user)
        self.assertEqual(visit.status, AppointmentStatus.NO_SHOW)

        visit_checked_in = self._pending_visit()
        confirm_visit(visit_id=visit_checked_in.id, lab_user=self.lab_user)
        check_in_visit(visit_id=visit_checked_in.id, lab_user=self.lab_user)
        with self.assertRaises(VisitWorkflowError):
            reschedule_visit(visit_id=visit_checked_in.id, lab_user=self.lab_user)

        visit_completed = self._pending_visit()
        confirm_visit(visit_id=visit_completed.id, lab_user=self.lab_user)
        check_in_visit(visit_id=visit_completed.id, lab_user=self.lab_user)
        complete_visit(visit_id=visit_completed.id, lab_user=self.lab_user)
        with self.assertRaises(VisitWorkflowError):
            reschedule_visit(visit_id=visit_completed.id, lab_user=self.lab_user)

        visit_no_show = self._pending_visit()
        mark_no_show(visit_id=visit_no_show.id, lab_user=self.lab_user)
        with self.assertRaises(VisitWorkflowError):
            reschedule_visit(visit_id=visit_no_show.id, lab_user=self.lab_user)

        visit_cancelled = self._pending_visit()
        visit_cancelled.status = AppointmentStatus.CANCELLED
        visit_cancelled.save(update_fields=["status", "updated_at"])
        with self.assertRaises(VisitWorkflowError):
            reschedule_visit(visit_id=visit_cancelled.id, lab_user=self.lab_user)
