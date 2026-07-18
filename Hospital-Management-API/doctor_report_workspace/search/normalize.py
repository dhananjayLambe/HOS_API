"""Search term normalization for the workspace search engine."""

from __future__ import annotations

import re

_MULTI_SPACE = re.compile(r"\s+")


def normalize_search_term(raw: str | None) -> str:
    """Trim edges and collapse internal whitespace; preserve punctuation and leading zeros."""
    if raw is None:
        return ""
    text = str(raw).strip()
    if not text:
        return ""
    return _MULTI_SPACE.sub(" ", text)
