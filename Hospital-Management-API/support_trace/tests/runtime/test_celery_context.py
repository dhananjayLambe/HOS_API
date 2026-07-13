"""Celery context resolver tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.runtime.celery_context import CeleryContextResolver


class CeleryContextTests(SimpleTestCase):
    def test_resolve_without_active_task(self) -> None:
        result = CeleryContextResolver.resolve()
        self.assertIsInstance(result, dict)

    def test_resolve_with_mock_request(self) -> None:
        class Req:
            id = "task-abc"
            hostname = "worker-1"
            delivery_info = {"routing_key": "celery", "exchange": ""}

        result = CeleryContextResolver.resolve(Req())
        self.assertEqual(result.get("celery_task_id"), "task-abc")
