"""Synchronizes identifiers from audit events into SupportTrace projections."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.enums import TraceSource
from support_trace.identifiers.extraction_registry import ExtractionRegistry
from support_trace.identifiers.hooks import fail_open_identifier
from support_trace.identifiers.lookup_keys import (
    accumulative_merge,
    build_search_vector,
    count_identifiers,
    identifiers_from_trace,
)
from support_trace.identifiers.types import IdentifierSyncResult
from support_trace.identifiers.validation_registry import ValidationRegistry
from support_trace.workflow.types import ResolvedWorkflow

logger = logging.getLogger(__name__)


class IdentifierSyncService:
    """Extracts, normalizes, validates, and accumulatively merges identifiers."""

    @classmethod
    def sync(
        cls,
        event: SupportTraceSyncEvent,
        *,
        resolved: ResolvedWorkflow,
        existing: Any | None = None,
    ) -> IdentifierSyncResult:
        return fail_open_identifier(
            "identifier_sync",
            lambda: cls._sync_impl(event, resolved=resolved, existing=existing),
            default=IdentifierSyncResult(
                identifiers=identifiers_from_trace(existing),
                identifier_count=count_identifiers(identifiers_from_trace(existing)),
                first_seen_at=getattr(existing, "first_seen_at", None),
                last_seen_at=getattr(existing, "last_seen_at", None),
            ),
        )

    @classmethod
    def _sync_impl(
        cls,
        event: SupportTraceSyncEvent,
        *,
        resolved: ResolvedWorkflow,
        existing: Any | None,
    ) -> IdentifierSyncResult:
        extracted = ExtractionRegistry.extract(
            event,
            source=event.source,
        )
        merged = ExtractionRegistry.merge(
            resolved.identifiers,
            event.identifiers,
            extracted,
        )
        accumulative = accumulative_merge(existing, merged)
        validated = ValidationRegistry.validate_dict(accumulative)
        now = datetime.now(timezone.utc)
        prior_ids = identifiers_from_trace(existing)
        changed = validated != prior_ids
        first_seen = getattr(existing, "first_seen_at", None)
        if validated and first_seen is None:
            first_seen = now
        last_seen = getattr(existing, "last_seen_at", None)
        if changed and validated:
            last_seen = now
        return IdentifierSyncResult(
            identifiers=validated,
            identifier_count=count_identifiers(validated),
            first_seen_at=first_seen,
            last_seen_at=last_seen,
        )

    @classmethod
    def build_search_vector(cls, identifiers: dict[str, str]) -> dict[str, list[str]]:
        return build_search_vector(identifiers)
