"""Payload builders for recommendation audit events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_payload


class RecommendationPayloadBuilder:
    """Builds sanitized payload dicts for recommendation audit events."""

    @staticmethod
    def build_generated(
        *,
        recommendation_type: str = "Diagnostic",
        recommendation_count: int = 0,
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "recommendation_type": recommendation_type,
                "recommendation_count": recommendation_count,
            }
        )

    @staticmethod
    def build_accepted(
        *,
        accepted_items: int = 0,
        rejected_items: int = 0,
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "accepted_items": accepted_items,
                "rejected_items": rejected_items,
            }
        )

    @staticmethod
    def count_from_result(result) -> int:
        if result is None:
            return 0
        tests = getattr(result, "expanded_tests", None) or []
        packages = getattr(result, "packages", None) or []
        return len(tests) + len(packages)
