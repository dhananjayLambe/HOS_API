"""Snapshot builders for recommendation acceptance audit events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_snapshot


class RecommendationSnapshotBuilder:
    """Builds lightweight prior-state snapshots for recommendation acceptance."""

    @staticmethod
    def build_acceptance_snapshot(
        *,
        prior_accepted_items: int | None = None,
        prior_rejected_items: int | None = None,
    ) -> dict[str, Any]:
        snapshot = {
            "accepted_items": prior_accepted_items,
            "rejected_items": prior_rejected_items,
        }
        return sanitize_audit_snapshot(snapshot)
