from __future__ import annotations

from collections.abc import Iterable, Sequence

from diagnostics_engine.models.choices import CollectionType, PackageType


def require_columns(row_keys: Iterable[str], required: Sequence[str], *, row_ref: str) -> None:
    keys = set(row_keys)
    missing = [c for c in required if c not in keys]
    if missing:
        raise ValueError(f"{row_ref}: missing columns: {', '.join(missing)}")


def normalize_choice_value(raw: str, choices: type) -> str:
    """Map CSV string to model choice value (case-insensitive)."""
    v = (raw or "").strip().lower()
    for val, _label in choices.choices:
        if str(val).lower() == v:
            return str(val)
    allowed = ", ".join(str(c[0]) for c in choices.choices)
    raise ValueError(f"invalid value {raw!r}; expected one of: {allowed}")


def validate_package_type(raw: str) -> str:
    return normalize_choice_value(raw, PackageType)


def validate_collection_type(raw: str) -> str:
    return normalize_choice_value(raw, CollectionType)


def duplicate_natural_keys(rows: Sequence[tuple[str, str]]) -> list[str]:
    """
    rows: sequence of (row_ref, natural_key) for keys that must be unique in-file.
    Returns error messages for duplicates (second and later occurrences).
    """
    seen: dict[str, str] = {}
    errors: list[str] = []
    for row_ref, key in rows:
        if not key:
            continue
        if key in seen:
            errors.append(f"{row_ref}: duplicate key in file (first at {seen[key]}): {key!r}")
        else:
            seen[key] = row_ref
    return errors
