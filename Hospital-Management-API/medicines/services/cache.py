import hashlib
import json
from typing import Any

from django.core.cache import cache

SUGGESTION_CACHE_PREFIX = "med_suggest"
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


def get_cached_suggestions(key: str) -> Any | None:
    return cache.get(key)


def set_cached_suggestions(key: str, payload: dict, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
    # JSON-serializable payload only
    json.dumps(payload)  # fail fast if not serializable
    cache.set(key, payload, ttl_seconds)
