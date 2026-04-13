"""
JSON-backed instruction suggestions for consultation UI.
Uses MetadataLoader — no database reads per request.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple

from django.core.cache import cache

from consultations_core.services.metadata_loader import MetadataLoader

# Relative paths under templates_metadata/
MASTER_PATH = "consultation/instructions/instructions_master.json"
DETAILS_PATH = "consultation/instructions/instruction_details.json"
SPECIALTY_PATH = "consultation/instructions/specialty_instructions.json"

# UI-aligned category ordering: warnings and monitoring first, then the rest.
# See load_instruction_templates.CATEGORY_ORDER and product spec Section 6.
CATEGORY_SORT_WEIGHT: Dict[str, int] = {
    "warning_signs": 0,
    "monitoring": 1,
    "general_advice": 2,
    "diet_lifestyle": 3,
    "activity_restriction": 4,
    "disease_specific": 5,
}

_SPECIALTY_ORDER_FALLBACK = 10**6
_SUGGESTIONS_CACHE_TTL_SECONDS = 120


def normalize_specialty(raw: Optional[str]) -> str:
    return (raw or "").strip().lower().replace(" ", "_")


def _category_weight(code: str) -> int:
    return CATEGORY_SORT_WEIGHT.get(code, 99)


def _suggestions_cache_key(
    *,
    q: Optional[str],
    specialty: Optional[str],
    category: Optional[str],
) -> str:
    q_norm = (q or "").strip().lower()
    specialty_norm = normalize_specialty(specialty)
    category_norm = normalize_specialty(category)
    return f"instructions:suggestions:v1:{q_norm}:{specialty_norm}:{category_norm}"


def _load_sources() -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    master = MetadataLoader.get(MASTER_PATH)
    details = MetadataLoader.get(DETAILS_PATH)
    specialty = MetadataLoader.get(SPECIALTY_PATH)
    return master, details, specialty


def _specialty_allowed_keys_and_order(
    specialty_raw: Optional[str], specialty_data: Dict[str, Any]
) -> Tuple[Optional[Set[str]], Dict[str, int]]:
    """
    Returns (allowed_key_set or None for 'all'), and key -> index for ordering.
    If specialty is invalid / missing from JSON, returns (None, {}) — caller uses full master.
    """
    norm = normalize_specialty(specialty_raw)
    if not norm:
        return None, {}

    raw_list = specialty_data.get(norm)
    if not isinstance(raw_list, list):
        return None, {}

    allowed = set(raw_list)
    order = {k: i for i, k in enumerate(raw_list)}
    return allowed, order


def get_instruction_suggestions(
    *,
    q: Optional[str] = None,
    specialty: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    exclude: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Returns { "data": [...], "meta": { "total", "filtered" } }.

    meta.total: matches after all filters, before limit.
    meta.filtered: number of rows returned (len(data)).
    """
    exclude_set = set(exclude or [])
    limit = max(1, min(int(limit), 100))
    cache_key = _suggestions_cache_key(q=q, specialty=specialty, category=category)
    cached_rows = cache.get(cache_key)
    if isinstance(cached_rows, list):
        rows = cached_rows
        filtered_rows = [row for row in rows if row.get("key") not in exclude_set]
        sliced = filtered_rows[:limit]
        return {
            "data": sliced,
            "meta": {
                "total": len(filtered_rows),
                "filtered": len(sliced),
            },
        }

    master, details_root, specialty_data = _load_sources()
    items: Dict[str, Any] = master.get("items") or {}

    # instruction_details.json wraps rules under some keys; template keys match master item keys
    details: Dict[str, Any] = {
        k: v for k, v in details_root.items() if k not in ("version", "meta") and isinstance(v, dict)
    }

    allowed_keys, specialty_order = _specialty_allowed_keys_and_order(specialty, specialty_data)

    q_norm = (q or "").strip().lower()
    cat_norm = normalize_specialty(category) if category else ""

    # Build candidate rows (pre-sort), excluding "exclude" because we apply that post-cache.
    candidates: List[Tuple[str, Dict[str, Any]]] = []
    for key, entry in items.items():
        if not isinstance(entry, dict):
            continue
        if allowed_keys is not None and key not in allowed_keys:
            continue

        cat_code = entry.get("category") or "general_advice"
        if cat_norm and normalize_specialty(cat_code) != cat_norm:
            continue

        label = entry.get("label") or key
        if q_norm and q_norm not in label.lower():
            continue

        candidates.append((key, entry))

    def sort_key(item: Tuple[str, Dict[str, Any]]):
        key, entry = item
        label = entry.get("label") or key
        cat_code = entry.get("category") or "general_advice"
        spec_idx = specialty_order.get(key, _SPECIALTY_ORDER_FALLBACK)
        return (
            spec_idx,
            _category_weight(cat_code),
            label.lower(),
            key,
        )

    candidates.sort(key=sort_key)

    rows: List[Dict[str, Any]] = []
    for key, entry in candidates:
        requires_input = bool(entry.get("requires_input", False))
        field_list: List[Dict[str, Any]] = []
        if requires_input:
            detail_block = details.get(key) or {}
            field_list = list(detail_block.get("fields") or [])

        rows.append(
            {
                "key": key,
                "label": entry.get("label") or key,
                "category": entry.get("category") or "general_advice",
                "requires_input": requires_input,
                "fields": field_list,
            }
        )

    cache.set(cache_key, rows, timeout=_SUGGESTIONS_CACHE_TTL_SECONDS)
    filtered_rows = [row for row in rows if row.get("key") not in exclude_set]
    sliced = filtered_rows[:limit]

    return {
        "data": sliced,
        "meta": {
            "total": len(filtered_rows),
            "filtered": len(sliced),
        },
    }
