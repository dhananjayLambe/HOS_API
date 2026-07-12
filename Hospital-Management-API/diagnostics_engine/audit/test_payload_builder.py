"""Payload builders for diagnostic test audit events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_payload


class TestPayloadBuilder:
    """Builds sanitized payload dicts for diagnostic test audit events."""

    @staticmethod
    def build_ordered(
        *,
        test_count: int,
        order_source: str = "consultation",
        home_collection: bool = False,
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "test_count": test_count,
                "order_source": order_source,
                "home_collection": home_collection,
            }
        )

    @staticmethod
    def build_recommendation_sent(
        *,
        recommendation_channel: str = "whatsapp",
        test_count: int = 0,
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "recommendation_channel": recommendation_channel,
                "test_count": test_count,
            }
        )

    @staticmethod
    def order_source_label(source: str | None) -> str:
        normalized = (source or "").strip().lower()
        if normalized in ("emr", "consultation", "doctor"):
            return "consultation"
        return normalized or "consultation"

    @staticmethod
    def home_collection_for_order(order) -> bool:
        mode = getattr(order, "sample_collection_mode", None)
        return mode == "home"

    @staticmethod
    def order_test_count(order, *, fallback: int = 0) -> int:
        if hasattr(order, "test_lines"):
            return order.test_lines.count()
        return fallback

    @staticmethod
    def recommendation_count_from_payload(payload: dict | None) -> int:
        data = payload or {}
        for key in ("test_count", "recommendation_count"):
            value = data.get(key)
            if value is not None:
                try:
                    return max(0, int(value))
                except (TypeError, ValueError):
                    pass
        expanded = data.get("expanded_tests") or data.get("tests") or []
        if isinstance(expanded, list):
            return len(expanded)
        return 0
