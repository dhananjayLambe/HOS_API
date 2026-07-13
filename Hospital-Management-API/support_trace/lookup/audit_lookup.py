"""Extract audit rows from timeline fetch bundle."""

from __future__ import annotations

from typing import Any

from support_trace.timeline.types import TimelineFetchBundle


class AuditLookupDelegate:
    @staticmethod
    def extract(bundle: TimelineFetchBundle) -> tuple[tuple[Any, ...], tuple[Any, ...]]:
        return tuple(bundle.clinical_rows), tuple(bundle.business_rows)
