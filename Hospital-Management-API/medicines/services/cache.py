import hashlib
import json
from typing import Any, TypedDict

from django.core.cache import cache

SUGGESTION_CACHE_PREFIX = "med_suggest"
HYBRID_SUGGESTION_CACHE_PREFIX = "med_hybrid_suggest"
DEFAULT_TTL_SECONDS = 8 * 60  # 8 minutes


def suggestion_cache_key(
    doctor_id: str,
    diagnosis_ids: list[str],
    patient_key: str,
    limit: int,
) -> str:
    """Include explicit :limit: segment so cached payloads never mix different limit values."""
    diag_part = ",".join(sorted(diagnosis_ids))
    h = hashlib.sha256(diag_part.encode("utf-8")).hexdigest()[:16]
    return f"{SUGGESTION_CACHE_PREFIX}:{doctor_id}:{h}:{patient_key}:limit:{limit}"


def hybrid_suggestion_cache_key(
    doctor_id: str,
    diagnosis_ids: list[str],
    patient_key: str,
    limit: int,
) -> str:
    """Same segments as suggestion_cache_key; distinct prefix for JSON list entries."""
    diag_part = ",".join(sorted(diagnosis_ids))
    h = hashlib.sha256(diag_part.encode("utf-8")).hexdigest()[:16]
    return f"{HYBRID_SUGGESTION_CACHE_PREFIX}:{doctor_id}:{h}:{patient_key}:limit:{limit}"


def get_cached_suggestions(key: str) -> Any | None:
    return cache.get(key)


def set_cached_suggestions(key: str, payload: dict, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
    # JSON-serializable payload only
    json.dumps(payload)  # fail fast if not serializable
    cache.set(key, payload, ttl_seconds)


class HybridSuggestionEntry(TypedDict):
    drug_id: str
    score: float
    dominant_signal: str


def get_cached_hybrid_suggestion_entries(key: str) -> list[HybridSuggestionEntry] | None:
    val = cache.get(key)
    if val is None:
        return None
    if not isinstance(val, list):
        return None
    return val


def set_cached_hybrid_suggestion_entries(
    key: str,
    entries: list[HybridSuggestionEntry],
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> None:
    json.dumps(entries)
    cache.set(key, entries, ttl_seconds)
