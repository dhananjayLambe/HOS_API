"""Snapshot/state helpers for booking business audit events."""

from __future__ import annotations

from typing import Any


class BookingSnapshotBuilder:
    """Maps booking workflow transitions into structured change snapshots."""

    @staticmethod
    def modified_state(
        *,
        before: dict[str, Any],
        after: dict[str, Any],
        reason: str,
    ) -> dict[str, Any]:
        return {
            "reason": reason,
            "before": before,
            "after": after,
        }

    @staticmethod
    def cancelled_state(
        *,
        prior_status: str | None,
        cancellation_reason: str,
        cancelled_by_id: str | None,
    ) -> dict[str, Any]:
        return {
            "prior_status": prior_status,
            "cancellation_reason": cancellation_reason,
            "cancelled_by_id": cancelled_by_id,
        }

    @staticmethod
    def closed_state(
        *,
        prior_macro_state: str | None,
        order_status: str | None,
    ) -> dict[str, Any]:
        return {
            "prior_macro_state": prior_macro_state,
            "order_status": order_status,
        }

    @staticmethod
    def lifecycle_state(*, state_before: str | None, state_after: str) -> tuple[str | None, str]:
        return state_before, state_after

    @staticmethod
    def slot_snapshot(*, date, slot: str | None) -> dict[str, Any]:
        return {
            "slot": {
                "date": date.isoformat() if date is not None else None,
                "time": slot,
            }
        }

    @staticmethod
    def branch_snapshot(*, branch_id) -> dict[str, Any]:
        return {"branch_id": str(branch_id) if branch_id is not None else None}
