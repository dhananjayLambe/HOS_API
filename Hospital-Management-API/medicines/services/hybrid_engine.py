from __future__ import annotations

import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from django.db import close_old_connections

from medicines.models import DrugMaster
from medicines.services.cache import (
    HybridSuggestionEntry,
    get_cached_hybrid_suggestion_entries,
    hybrid_suggestion_cache_key,
    set_cached_hybrid_suggestion_entries,
)
from medicines.services.ranking import MedicineRanker
from medicines.services.search_engine import search_medicines
from medicines.services.suggestion_engine import MedicineSuggestionEngine

logger = logging.getLogger(__name__)

DEADLINE_SKIP_FTS_S = 0.15
DEADLINE_NO_COLD_SUGGEST_S = 0.2


def _display_name(drug: DrugMaster) -> str:
    return f"{drug.brand_name} {drug.strength or ''}".strip()


def format_hybrid_result(drug: DrugMaster, source: str, score: float) -> dict[str, Any]:
    formulation = drug.formulation
    if formulation:
        form_payload = {"id": str(formulation.id), "name": formulation.name}
    else:
        form_payload = {"id": None, "name": "tablet"}
    return {
        "id": str(drug.id),
        "display_name": _display_name(drug),
        "brand_name": drug.brand_name,
        "strength": drug.strength or "",
        "drug_type": drug.drug_type,
        "formulation": form_payload,
        "source": source,
        "score": round(float(score), 4),
    }


def _hydrate_drugs(drug_ids: set[uuid.UUID]) -> dict[uuid.UUID, DrugMaster]:
    if not drug_ids:
        return {}
    qs = (
        DrugMaster.objects.filter(id__in=drug_ids, is_active=True)
        .select_related("formulation")
        .only(
            "id",
            "brand_name",
            "strength",
            "drug_type",
            "formulation",
        )
    )
    return {d.id: d for d in qs}


def _rows_to_cache_entries(rows: list[dict]) -> list[HybridSuggestionEntry]:
    out: list[HybridSuggestionEntry] = []
    for r in rows:
        drug = r["drug"]
        out.append(
            {
                "drug_id": str(drug.id),
                "score": float(r["final_score"]),
                "dominant_signal": str(r["dominant_signal"]),
            }
        )
    return out


def _filter_entries_by_brand_q(
    entries: list[HybridSuggestionEntry],
    drugs_by_id: dict[uuid.UUID, DrugMaster],
    q_norm: str,
) -> list[HybridSuggestionEntry]:
    if not q_norm:
        return entries
    out: list[HybridSuggestionEntry] = []
    for e in entries:
        try:
            did = uuid.UUID(e["drug_id"])
        except (ValueError, TypeError):
            continue
        d = drugs_by_id.get(did)
        if not d:
            continue
        bn = (d.brand_name or "").lower()
        if q_norm in bn:
            out.append(e)
    return out


def _resolve_source(search_norm: float, suggestion_norm: float, dominant_signal: str) -> str:
    if search_norm > suggestion_norm:
        return "search"
    return dominant_signal


def run_hybrid(
    *,
    doctor_id: uuid.UUID,
    patient_id: uuid.UUID | None,
    diagnosis_ids: list[uuid.UUID],
    symptom_ids: list[uuid.UUID],
    limit: int,
    q_raw: str | None,
) -> dict[str, Any]:
    t0 = time.monotonic()
    cap = min(max(int(limit), 1), 15)
    q_stripped = (q_raw or "").strip()
    q_norm = q_stripped.lower()

    diagnosis_ids_for_cache = sorted(str(x) for x in diagnosis_ids)
    patient_key = str(patient_id) if patient_id else "np"
    cache_key = hybrid_suggestion_cache_key(
        str(doctor_id),
        diagnosis_ids_for_cache,
        patient_key,
        cap,
    )

    if not q_norm:
        entries = get_cached_hybrid_suggestion_entries(cache_key)
        if entries is None:
            engine = MedicineSuggestionEngine(
                doctor_id=doctor_id,
                patient_id=patient_id,
                diagnosis_ids=diagnosis_ids,
                symptom_ids=symptom_ids,
                limit=cap,
            )
            rows = engine.run_ranked_rows()
            entries = _rows_to_cache_entries(rows)
            set_cached_hybrid_suggestion_entries(cache_key, entries)

        ids = set()
        for e in entries:
            try:
                ids.add(uuid.UUID(e["drug_id"]))
            except (ValueError, TypeError):
                continue
        drugs_by_id = _hydrate_drugs(ids)
        results: list[dict[str, Any]] = []
        for e in entries:
            try:
                did = uuid.UUID(e["drug_id"])
            except (ValueError, TypeError):
                continue
            drug = drugs_by_id.get(did)
            if not drug:
                continue
            sn = float(e["score"])
            dom = str(e["dominant_signal"])
            fs = MedicineRanker.hybrid_merge_score(0.0, sn)
            src = _resolve_source(0.0, sn, dom)
            results.append(format_hybrid_result(drug, src, fs))

        results.sort(key=lambda r: r["score"], reverse=True)
        timing_ms = (time.monotonic() - t0) * 1000.0
        return {
            "results": results[:cap],
            "meta": {"mode": "suggestion", "timing_ms": round(timing_ms, 2)},
        }

    mode = "hybrid_light" if len(q_norm) <= 2 else "hybrid_strong"

    def task_search() -> list[tuple[DrugMaster, float]]:
        close_old_connections()
        try:
            elapsed = time.monotonic() - t0
            include_fts = mode == "hybrid_strong" and elapsed <= DEADLINE_SKIP_FTS_S
            return search_medicines(q_norm, include_fts=include_fts)
        except Exception:
            logger.exception("hybrid search failed; using suggestions merge only")
            return []

    def task_suggestions() -> list[HybridSuggestionEntry]:
        close_old_connections()
        cached = get_cached_hybrid_suggestion_entries(cache_key)
        if cached is not None:
            return cached
        if time.monotonic() - t0 > DEADLINE_NO_COLD_SUGGEST_S:
            return []
        engine = MedicineSuggestionEngine(
            doctor_id=doctor_id,
            patient_id=patient_id,
            diagnosis_ids=diagnosis_ids,
            symptom_ids=symptom_ids,
            limit=cap,
        )
        rows = engine.run_ranked_rows()
        entries = _rows_to_cache_entries(rows)
        set_cached_hybrid_suggestion_entries(cache_key, entries)
        return entries

    with ThreadPoolExecutor(max_workers=2) as ex:
        f_search = ex.submit(task_search)
        f_sug = ex.submit(task_suggestions)
        search_hits = f_search.result()
        sug_entries = f_sug.result()

    all_ids: set[uuid.UUID] = set()
    for drug, _ in search_hits:
        all_ids.add(drug.id)
    for e in sug_entries:
        try:
            all_ids.add(uuid.UUID(e["drug_id"]))
        except (ValueError, TypeError):
            pass

    drugs_by_id = _hydrate_drugs(all_ids)

    sug_entries = _filter_entries_by_brand_q(sug_entries, drugs_by_id, q_norm)

    merged: dict[uuid.UUID, dict[str, Any]] = {}

    for drug, search_norm in search_hits:
        merged[drug.id] = {
            "search_norm": float(search_norm),
            "suggestion_norm": 0.0,
            "dominant_signal": "global",
            "drug": drug,
        }

    for e in sug_entries:
        try:
            did = uuid.UUID(e["drug_id"])
        except (ValueError, TypeError):
            continue
        sn = float(e["score"])
        dom = str(e["dominant_signal"])
        drug = drugs_by_id.get(did)
        if did in merged:
            merged[did]["suggestion_norm"] = sn
            merged[did]["dominant_signal"] = dom
        else:
            if not drug:
                continue
            merged[did] = {
                "search_norm": 0.0,
                "suggestion_norm": sn,
                "dominant_signal": dom,
                "drug": drug,
            }

    out_rows: list[tuple[DrugMaster, float, str]] = []
    for did, m in merged.items():
        drug = m["drug"]
        if drug is None:
            drug = drugs_by_id.get(did)
        if drug is None:
            continue
        sn = float(m["suggestion_norm"])
        s_norm = float(m["search_norm"])
        fs = MedicineRanker.hybrid_merge_score(s_norm, sn)
        src = _resolve_source(s_norm, sn, str(m["dominant_signal"]))
        out_rows.append((drug, fs, src))

    out_rows.sort(key=lambda x: x[1], reverse=True)
    results = [format_hybrid_result(d, src, score) for d, score, src in out_rows[:cap]]

    timing_ms = (time.monotonic() - t0) * 1000.0
    return {
        "results": results,
        "meta": {"mode": mode, "timing_ms": round(timing_ms, 2)},
    }
