"""Snapshot/state helpers for recommendation business audit events."""

from __future__ import annotations


class RecommendationSnapshotBuilder:
    """Maps prior workflow state into state_before/state_after columns."""

    @staticmethod
    def retry_state(
        *,
        prior_status: str | None,
        prior_retry_count: int | None,
        provider_response_code: str | None = None,
    ) -> tuple[str | None, str | None]:
        before_parts = []
        if prior_status:
            before_parts.append(f"status={prior_status}")
        if prior_retry_count is not None:
            before_parts.append(f"retry={prior_retry_count}")
        if provider_response_code:
            before_parts.append(f"code={provider_response_code}")
        state_before = ", ".join(before_parts) if before_parts else None
        return state_before, "Retrying"

    @staticmethod
    def failed_state(*, prior_status: str | None) -> tuple[str | None, str | None]:
        return prior_status, "Failed"

    @staticmethod
    def lifecycle_state(*, state_before: str | None, state_after: str) -> tuple[str | None, str]:
        return state_before, state_after
