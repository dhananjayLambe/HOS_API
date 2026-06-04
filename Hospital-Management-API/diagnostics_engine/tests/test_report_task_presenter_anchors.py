"""Report task DTO logistics anchor helpers."""

from datetime import datetime, timezone
from types import SimpleNamespace
from diagnostics_engine.services.reports.report_task_presenter import (
    _operational_anchor_at,
    _sample_collected_at_for_order,
)


def test_sample_collected_at_prefers_home_collection_collected_at():
    order = SimpleNamespace(
        collection_request=SimpleNamespace(collected_at=datetime(2026, 6, 4, 10, 0, tzinfo=timezone.utc)),
        visit_appointment=None,
    )
    assert _sample_collected_at_for_order(order) == order.collection_request.collected_at


def test_sample_collected_at_uses_visit_checked_in_at():
    order = SimpleNamespace(
        collection_request=None,
        visit_appointment=SimpleNamespace(
            checked_in_at=datetime(2026, 6, 4, 11, 0, tzinfo=timezone.utc),
        ),
    )
    assert _sample_collected_at_for_order(order) == order.visit_appointment.checked_in_at


def test_operational_anchor_at_prefers_sample_collected_over_assigned():
    assigned = datetime(2026, 6, 3, 8, 0, tzinfo=timezone.utc)
    collected = datetime(2026, 6, 4, 10, 0, tzinfo=timezone.utc)
    anchor = _operational_anchor_at(
        assigned_at=assigned,
        sample_collected_at=collected,
        uploaded_at=None,
        ready_at=None,
        delivered_at=None,
    )
    assert anchor == collected


def test_operational_anchor_at_falls_back_to_upload_timestamps():
    uploaded = datetime(2026, 6, 5, 9, 0, tzinfo=timezone.utc)
    anchor = _operational_anchor_at(
        assigned_at=None,
        sample_collected_at=None,
        uploaded_at=uploaded,
        ready_at=None,
        delivered_at=None,
    )
    assert anchor == uploaded
