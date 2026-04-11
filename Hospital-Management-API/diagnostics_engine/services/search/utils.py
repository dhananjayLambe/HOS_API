from __future__ import annotations

import hashlib

from diagnostics_engine.text_normalize import normalize_search_text


def validate_query(raw_q: str | None) -> tuple[str | None, str | None]:
    """
    Returns (normalized_query, error_message).
    error_message is set when request should be 400.
    """
    if raw_q is None:
        return None, "Query parameter 'q' is required."
    s = str(raw_q).strip()
    if len(s) < 2:
        return None, "Query must be at least 2 characters."
    normalized = normalize_search_text(s)
    if len(normalized) < 2:
        return None, "Query must be at least 2 characters after normalization."
    return normalized, None


def cache_key_hash(normalized_q: str) -> str:
    return hashlib.sha256(normalized_q.encode("utf-8")).hexdigest()[:32]


def build_cache_key(normalized_q: str, type_filter: str, limit: int) -> str:
    from .constants import CACHE_KEY_PREFIX

    h = cache_key_hash(normalized_q)
    return f"{CACHE_KEY_PREFIX}:{type_filter}:{limit}:{h}"
