from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.cache import cache

from .constants import CACHE_TTL_SECONDS


def get_cached(key: str) -> dict[str, Any] | None:
    val = cache.get(key)
    if isinstance(val, dict):
        return val
    return None


def set_cached(key: str, payload: dict[str, Any], ttl_seconds: int | None = None) -> None:
    ttl = int(getattr(settings, "DIAG_SEARCH_CACHE_TTL_SECONDS", ttl_seconds or CACHE_TTL_SECONDS))
    cache.set(key, payload, ttl)
