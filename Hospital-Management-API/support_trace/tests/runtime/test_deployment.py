"""Deployment metadata tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.runtime.deployment import DeploymentMetadata


class DeploymentTests(SimpleTestCase):
    def test_resolve_returns_version(self) -> None:
        data = DeploymentMetadata.resolve()
        self.assertIn("deployment_version", data)
        self.assertIn("environment", data)

    def test_resolve_hostname(self) -> None:
        data = DeploymentMetadata.resolve()
        self.assertTrue(data.get("hostname") is None or isinstance(data["hostname"], str))
