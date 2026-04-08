from __future__ import annotations

import uuid
from datetime import datetime

from django.utils import timezone
from django.utils.timesince import timesince

from medicines.models import DrugMaster


def _dt_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _last_used_ago(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return f"{timesince(dt, timezone.now())} ago"


def _display_name(drug: DrugMaster) -> str:
    return f"{drug.brand_name} {drug.strength or ''}".strip()


def drug_to_payload(
    drug: DrugMaster,
    *,
    final_score: float | None = None,
    components: dict[str, float] | None = None,
    dominant_signal: str | None = None,
    source: str | None = None,
    last_used_at: datetime | None = None,
    include_scores: bool = False,
    autofill: dict | None = None,
) -> dict:
    formulation = drug.formulation
    payload = {
        "id": str(drug.id),
        "brand_name": drug.brand_name,
        "display_name": _display_name(drug),
        "generic_name": drug.generic_name,
        "strength": drug.strength,
        "drug_type": drug.drug_type,
        "is_common": drug.is_common,
        "formulation": (
            {"id": str(formulation.id), "name": formulation.name} if formulation else None
        ),
        "source": source or dominant_signal,
        "last_used": _dt_iso(last_used_at),
        "last_used_ago": _last_used_ago(last_used_at),
    }
    if autofill is not None:
        payload["autofill"] = autofill
    if include_scores:
        payload["final_score"] = final_score
        payload["components"] = components
        payload["dominant_signal"] = dominant_signal
    return payload


def serialize_bucket_rows(
    rows: list[dict],
    *,
    include_scores: bool = False,
    autofill_by_drug_id: dict[uuid.UUID, dict] | None = None,
) -> list[dict]:
    out: list[dict] = []
    for r in rows:
        drug = r["drug"]
        af = None
        if autofill_by_drug_id is not None:
            af = autofill_by_drug_id.get(drug.id)
        out.append(
            drug_to_payload(
                drug,
                final_score=r.get("final_score"),
                components=r.get("components"),
                dominant_signal=r.get("dominant_signal"),
                source=r.get("source"),
                last_used_at=r.get("last_used_at"),
                include_scores=include_scores,
                autofill=af,
            )
        )
    return out


def serialize_suggestion_response(
    buckets: dict[str, list[dict]],
    *,
    include_scores: bool = False,
    autofill_by_drug_id: dict[uuid.UUID, dict] | None = None,
) -> dict:
    return {
        key: serialize_bucket_rows(
            rows,
            include_scores=include_scores,
            autofill_by_drug_id=autofill_by_drug_id,
        )
        for key, rows in buckets.items()
    }


def serialize_hybrid_result(drug: DrugMaster, source: str, score: float) -> dict:
    from medicines.services.hybrid_engine import format_hybrid_result

    return format_hybrid_result(drug, source, score)


__all__ = [
    "drug_to_payload",
    "serialize_bucket_rows",
    "serialize_hybrid_result",
    "serialize_suggestion_response",
]
