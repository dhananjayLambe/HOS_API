"""Unit tests for pricing catalog presenter helpers."""

from __future__ import annotations

from decimal import Decimal

from django.test import SimpleTestCase

from labs.api.services.pricing_catalog_presenter import (
    format_optional_price_display,
    resolve_platform_margin,
    sanitize_catalog_metadata,
)


class PricingCatalogPresenterTestCase(SimpleTestCase):
    def test_resolve_platform_margin_from_cost_price(self):
        margin = resolve_platform_margin(
            selling_price=Decimal("850"),
            cost_price=Decimal("620"),
            platform_margin_snapshot=Decimal("99"),
        )
        self.assertEqual(margin, Decimal("230"))

    def test_resolve_platform_margin_fallback_to_snapshot(self):
        margin = resolve_platform_margin(
            selling_price=Decimal("100"),
            cost_price=None,
            platform_margin_snapshot=Decimal("40"),
        )
        self.assertEqual(margin, Decimal("40"))

    def test_resolve_platform_margin_none_when_no_inputs(self):
        margin = resolve_platform_margin(
            selling_price=Decimal("100"),
            cost_price=None,
            platform_margin_snapshot=None,
        )
        self.assertIsNone(margin)

    def test_format_optional_price_display_none(self):
        self.assertEqual(format_optional_price_display(None, "INR"), "—")

    def test_sanitize_catalog_metadata_strips_finance_keys(self):
        raw = {
            "workflow_hint": "ok",
            "last_synced_at": "2026-01-01T00:00:00+00:00",
            "doctor_margin_snapshot": "10",
            "lab_payout_snapshot": "50",
            "platform_margin_value": "5",
        }
        cleaned = sanitize_catalog_metadata(raw)
        self.assertEqual(cleaned, {"workflow_hint": "ok", "last_synced_at": "2026-01-01T00:00:00+00:00"})
        self.assertNotIn("doctor_margin_snapshot", cleaned)
