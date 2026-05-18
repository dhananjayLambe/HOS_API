"""Shared assertions for visit workflow service tests."""

from __future__ import annotations

from labs.models import LabVisitAppointment
from labs.services.visit_workflow import allowed_actions_for_status, workflow_hint_for_status

REQUIRED_EVENT_KEYS = frozenset(
    {
        "event",
        "timestamp",
        "performed_by_user_id",
        "previous_status",
        "to_status",
    },
)


def assert_event_schema(test_case, event: dict) -> None:
    test_case.assertEqual(set(event.keys()) & REQUIRED_EVENT_KEYS, REQUIRED_EVENT_KEYS)


def assert_events_ordered(test_case, events: list[dict], *, expected_len: int | None = None) -> None:
    if expected_len is not None:
        test_case.assertEqual(len(events), expected_len)
    for event in events:
        assert_event_schema(test_case, event)
    timestamps = [e["timestamp"] for e in events]
    test_case.assertEqual(timestamps, sorted(timestamps))


def assert_status_contract(
    test_case,
    visit: LabVisitAppointment,
    *,
    expected_status: str,
    expected_actions: list[str],
    expected_hint: str,
) -> None:
    test_case.assertEqual(visit.status, expected_status)
    test_case.assertEqual(allowed_actions_for_status(visit.status), expected_actions)
    test_case.assertEqual(workflow_hint_for_status(visit.status), expected_hint)


WORKFLOW_POST_KEYS = frozenset(
    {
        "success",
        "appointment_status",
        "workflow_hint",
        "allowed_actions",
        "message",
        "appointment_id",
        "confirmed_at",
        "checked_in_at",
        "completed_at",
        "no_show_at",
        "cancelled_at",
        "status_updated_at",
    },
)


def assert_visit_workflow_post_contract(
    test_case,
    response,
    *,
    expected_status: str,
) -> None:
    test_case.assertEqual(response.status_code, 200)
    data = response.json()
    test_case.assertEqual(set(data.keys()), WORKFLOW_POST_KEYS)
    test_case.assertTrue(data["success"])
    test_case.assertEqual(data["appointment_status"], expected_status)
    test_case.assertEqual(data["allowed_actions"], allowed_actions_for_status(expected_status))
    test_case.assertEqual(data["workflow_hint"], workflow_hint_for_status(expected_status))
