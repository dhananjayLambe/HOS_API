from __future__ import annotations

import hashlib
import json
from typing import Any

from django.core.cache import cache

from .constants import ENGINE_VERSION

DEFAULT_TTL_SECONDS = 120


def make_context_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def suggestion_cache_key(encounter_id: str, context_hash: str) -> str:
    return f"inv_suggest:{ENGINE_VERSION}:enc:{encounter_id}:ctx:{context_hash}"


def get_cached_payload(key: str) -> dict[str, Any] | None:
    val = cache.get(key)
    if isinstance(val, dict):
        return val
    return None


def set_cached_payload(key: str, payload: dict[str, Any], ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
    json.dumps(payload, default=str)
    cache.set(key, payload, ttl_seconds)

