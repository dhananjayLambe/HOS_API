"""Shared pytest fixtures for the logging platform test suite."""

from __future__ import annotations

import pytest

from shared.logging.celery_context import reset_pending_log_context_stamp
from shared.logging.context import get_context_manager
from shared.logging.factory import reset_logging_state_for_tests


@pytest.fixture(autouse=True)
def _reset_logging_factory_state():
    """Reset factory singleton state between tests."""
    reset_logging_state_for_tests()
    yield
    reset_logging_state_for_tests()


@pytest.fixture(autouse=True)
def _clear_log_context():
    """Clear request context between tests."""
    get_context_manager().clear()
    reset_pending_log_context_stamp()
    yield
    get_context_manager().clear()
    reset_pending_log_context_stamp()


@pytest.fixture(scope="session", autouse=True)
def _register_logging_test_celery_tasks():
    """Import test Celery tasks so shared_task names are registered."""
    import shared.logging.tests.celery_tasks  # noqa: F401
    import shared.logging.tests.workflow  # noqa: F401
