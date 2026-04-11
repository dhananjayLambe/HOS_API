"""Shared text normalization for diagnostic catalog search_text and query strings."""

from __future__ import annotations

import re

_MAX_LEN = 100
_NON_WORD_SPACE = re.compile(r"[^\w\s]", re.UNICODE)
_SPACES = re.compile(r"\s+")


def normalize_search_text(value: str) -> str:
    """Lowercase, strip specials (keep Unicode word chars + spaces), collapse spaces, cap length."""
    if not value:
        return ""
    q = value.strip().lower()
    q = _NON_WORD_SPACE.sub("", q)
    q = _SPACES.sub(" ", q).strip()
    return q[:_MAX_LEN]


def compose_service_search_text(
    name: str,
    short_name: str,
    code: str,
    synonyms: list[str] | None,
    tags: list[str] | None,
) -> str:
    parts: list[str] = [name or "", short_name or "", code or ""]
    for s in synonyms or []:
        if s:
            parts.append(str(s))
    for t in tags or []:
        if t:
            parts.append(str(t))
    return normalize_search_text(" ".join(parts))


def compose_package_search_text(
    name: str,
    lineage_code: str,
    description: str,
    tags_json,
    item_service_parts: list[str],
) -> str:
    parts: list[str] = [name or "", lineage_code or "", description or ""]
    if isinstance(tags_json, list):
        for t in tags_json:
            if t:
                parts.append(str(t))
    parts.extend(p for p in item_service_parts if p)
    return normalize_search_text(" ".join(parts))
