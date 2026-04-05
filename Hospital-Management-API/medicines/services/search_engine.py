from __future__ import annotations

"""
Single-query medicine search: combined ILIKE + optional FTS, cap candidates, rank in Python.

Scalability: Candidate rows are always limited to ``MAX_CANDIDATES`` (SQL slice), so work is
bounded even if ``DrugMaster`` has millions of rows—assuming ``is_active``/``brand_name``/
``search_vector`` indexes are present (see ``DrugMaster.Meta.indexes``).
"""

from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import FloatField, Q, Value
from django.db.models.functions import Coalesce

from medicines.models import DrugMaster
from medicines.services.ranking import MedicineRanker

MAX_CANDIDATES = 50


def _raw_search_score(drug: DrugMaster, q: str, fts_rank: float) -> int:
    bn = (drug.brand_name or "").lower()
    raw = 0
    if bn == q:
        raw = max(raw, 120)
    elif bn.startswith(q):
        raw = max(raw, 100)
    elif q in bn:
        raw = max(raw, 60)
    elif fts_rank and fts_rank > 0:
        raw = max(raw, min(60, int(60 * min(1.0, float(fts_rank)))))
    if drug.is_common:
        raw += 20
    return raw


def search_medicines(q: str, *, include_fts: bool) -> list[tuple[DrugMaster, float]]:
    """
    Returns (drug, search_norm) sorted by search_norm descending.
    q must already be strip().lower().
    """
    base = DrugMaster.objects.filter(is_active=True).select_related("formulation")

    if include_fts:
        sq = SearchQuery(q)
        q_filter = (
            Q(brand_name__istartswith=q)
            | Q(brand_name__icontains=q)
            | Q(search_vector=sq)
        )
        qs = (
            base.filter(q_filter)
            .annotate(
                fts_rank=Coalesce(
                    SearchRank("search_vector", sq),
                    Value(0.0, output_field=FloatField()),
                )
            )
            .only(
                "id",
                "brand_name",
                "strength",
                "generic_name",
                "drug_type",
                "formulation",
                "is_common",
                "search_vector",
            )[:MAX_CANDIDATES]
        )
    else:
        q_filter = Q(brand_name__istartswith=q) | Q(brand_name__icontains=q)
        qs = (
            base.filter(q_filter)
            .annotate(fts_rank=Value(0.0, output_field=FloatField()))
            .only(
                "id",
                "brand_name",
                "strength",
                "generic_name",
                "drug_type",
                "formulation",
                "is_common",
                "search_vector",
            )[:MAX_CANDIDATES]
        )

    scored: list[tuple[DrugMaster, float]] = []
    for drug in qs:
        fts = float(getattr(drug, "fts_rank", 0.0) or 0.0)
        raw = _raw_search_score(drug, q, fts)
        scored.append((drug, MedicineRanker.search_norm_from_raw(raw)))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored
