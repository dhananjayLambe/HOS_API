"""Idempotency service for mutating report APIs."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from core.models import IdempotencyKey


class IdempotencyConflictError(Exception):
    """Same idempotency key reused with a different request body."""


@dataclass(frozen=True)
class IdempotencyReplay:
    response_status: int
    response_snapshot: dict[str, Any]


def _default_ttl_hours() -> int:
    return int(getattr(settings, "IDEMPOTENCY_KEY_TTL_HOURS", 24))


def normalize_request_hash(*, body: dict[str, Any] | None, path: str) -> str:
    payload = {"path": path, "body": body or {}}
    canonical = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def get_idempotency_header(request) -> str | None:
    raw = (request.META.get("HTTP_IDEMPOTENCY_KEY") or "").strip()
    return raw or None


@transaction.atomic
def begin_idempotent_request(
    *,
    scope: str,
    client_key: str,
    user,
    request_hash: str,
) -> IdempotencyReplay | None:
    """
    Return cached replay if key exists with matching hash; raise on hash mismatch.

    Returns None when this is the first request for the key (caller should proceed).
    """
    now = timezone.now()
    IdempotencyKey.objects.filter(expires_at__lt=now).delete()

    existing = (
        IdempotencyKey.objects.select_for_update()
        .filter(scope=scope, user=user, key=client_key)
        .first()
    )
    if existing is None:
        return None
    if existing.request_hash != request_hash:
        raise IdempotencyConflictError("Idempotency key reused with different request body.")
    return IdempotencyReplay(
        response_status=existing.response_status,
        response_snapshot=existing.response_snapshot,
    )


def store_idempotent_response(
    *,
    scope: str,
    client_key: str,
    user,
    request_hash: str,
    response_status: int,
    response_snapshot: dict[str, Any],
) -> None:
    expires_at = timezone.now() + timedelta(hours=_default_ttl_hours())
    try:
        IdempotencyKey.objects.create(
            scope=scope,
            key=client_key,
            user=user,
            request_hash=request_hash,
            response_status=response_status,
            response_snapshot=response_snapshot,
            expires_at=expires_at,
        )
    except IntegrityError:
        existing = IdempotencyKey.objects.filter(scope=scope, user=user, key=client_key).first()
        if existing and existing.request_hash == request_hash:
            return
        raise IdempotencyConflictError("Idempotency key conflict.") from None
