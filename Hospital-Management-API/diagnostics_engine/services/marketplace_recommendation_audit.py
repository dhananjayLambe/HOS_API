"""Persist Marketplace Recommendation API audit rows."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from diagnostics_engine.models.marketplace_recommendation_audit import MarketplaceRecommendationApiAudit

if TYPE_CHECKING:
    from django.http import HttpRequest

logger = logging.getLogger(__name__)


def _user_role_snapshot(user) -> str:
    if not user or not user.is_authenticated:
        return "anonymous"
    if user.is_superuser:
        return "superuser"
    names = list(user.groups.values_list("name", flat=True)[:3])
    return ",".join(names) if names else "authenticated"


def _client_ip(request: HttpRequest) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    raw = request.META.get("REMOTE_ADDR")
    return str(raw)[:45] if raw else None


def record_marketplace_recommendation_audit(
    *,
    request: HttpRequest,
    recommendation_id: Any,
    request_id: str,
    client_request_id: str | None,
    consultation_id: Any,
    http_status: int,
    available: bool,
    failure_reason: str | None,
    duration_ms: int,
    query_count: int | None = None,
) -> None:
    try:
        MarketplaceRecommendationApiAudit.objects.create(
            recommendation_id=recommendation_id,
            request_id=request_id[:128],
            client_request_id=(client_request_id or "")[:128],
            consultation_id=consultation_id,
            user_id=getattr(request.user, "pk", None),
            user_role_snapshot=_user_role_snapshot(request.user),
            http_status=http_status,
            available=available,
            failure_reason=(failure_reason or "")[:64],
            duration_ms=max(0, int(duration_ms)),
            query_count=query_count,
            ip_address=_client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:512],
        )
    except Exception:
        logger.exception(
            "recommendation.api.audit_failed recommendation_id=%s consultation_id=%s",
            recommendation_id,
            consultation_id,
        )


def emit_recommendation_metrics(
    *,
    available: bool,
    failure_reason: str | None,
    duration_ms: int,
    quoted_price: str | None = None,
    branch_id: str | None = None,
) -> None:
    """Structured metrics hook (dashboard wiring optional)."""
    logger.info(
        "recommendation.api.metrics available=%s failure_reason=%s duration_ms=%s "
        "quoted_price=%s branch_id=%s",
        available,
        failure_reason or "",
        duration_ms,
        quoted_price or "",
        branch_id or "",
    )
