"""Test-only utilities for Support Trace cleanup."""

from __future__ import annotations

from support_trace.models import SupportTrace


def purge_test_data(*, correlation_id: str | None = None) -> int:
    """Delete traces created in test fixtures. Not for production use."""
    qs = SupportTrace.objects.all()
    if correlation_id:
        qs = qs.filter(correlation_id=correlation_id)
    count, _ = qs.delete()
    return count
