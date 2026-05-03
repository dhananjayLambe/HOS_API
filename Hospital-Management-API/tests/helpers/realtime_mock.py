"""Mock Smart Queue Redis / channel sync for tests."""

from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import patch


@contextmanager
def mock_queue_realtime():
    """Patch realtime side effects; yields namespace with sync mock."""
    with patch(
        "queue_management.services.queue_service._sync_queue_realtime",
    ) as sync_mock, patch(
        "queue_management.api.views._sync_queue_realtime",
    ) as views_sync_mock, patch(
        "queue_management.services.queue_sync.update_queue_sorted_set",
    ) as sorted_mock, patch(
        "queue_management.services.queue_sync.publish_queue_update",
    ) as publish_mock:
        from types import SimpleNamespace

        yield SimpleNamespace(
            sync=sync_mock,
            views_sync=views_sync_mock,
            sorted_set=sorted_mock,
            publish=publish_mock,
        )
