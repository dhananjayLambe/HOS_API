import pytest

from tests.helpers.realtime_mock import mock_queue_realtime


@pytest.fixture(autouse=True)
def _mock_queue_realtime():
    with mock_queue_realtime():
        yield
