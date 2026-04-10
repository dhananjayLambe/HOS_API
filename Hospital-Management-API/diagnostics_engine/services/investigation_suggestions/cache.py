from __future__ import annotations

import hashlib
import json
from typing import Any

from django.conf import settings
from django.core.cache import cache

from .constants import ENGINE_VERSION

DEFAULT_TTL_SECONDS = 120


def make_context_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def suggestion_cache_key(encounter_id: str, context_hash: str) -> str:
    return f"inv_suggest:{ENGINE_VERSION}:enc:{encounter_id}:ctx:{context_hash}"


def suggestion_cache_pattern(encounter_id: str) -> str:
    return f"inv_suggest:*:enc:{encounter_id}:*"


def get_cached_payload(key: str) -> dict[str, Any] | None:
    val = cache.get(key)
    if isinstance(val, dict):
        return val
    return None


def set_cached_payload(key: str, payload: dict[str, Any], ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
    json.dumps(payload, default=str)
    ttl = int(getattr(settings, "INV_SUGGEST_CACHE_TTL_SECONDS", ttl_seconds))
    cache.set(key, payload, ttl)


def invalidate_encounter_suggestions(encounter_id: str) -> None:
    pattern = suggestion_cache_pattern(encounter_id)
    delete_pattern = getattr(cache, "delete_pattern", None)
    if callable(delete_pattern):
        delete_pattern(pattern)

