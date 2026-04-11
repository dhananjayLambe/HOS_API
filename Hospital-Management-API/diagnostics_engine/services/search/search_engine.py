from __future__ import annotations

from typing import Any

from django.contrib.postgres.search import TrigramSimilarity, TrigramWordSimilarity
from django.db.models import F, FloatField, Prefetch
from django.db.models.functions import Greatest

from diagnostics_engine.models import DiagnosticPackage, DiagnosticPackageItem, DiagnosticServiceMaster

from .cache import get_cached, set_cached
from .constants import (
    CANDIDATE_MULTIPLIER,
    DID_YOU_MEAN_THRESHOLD,
    TRIGRAM_THRESHOLD,
)
from .ranking import (
    category_label,
    package_synopsis,
    score_package,
    score_service,
    service_synopsis,
)
from .utils import build_cache_key


def _annotate_search_similarity(queryset, normalized_q: str):
    """
    Combine symmetric similarity with word_similarity(query, search_text).
    Short queries like "cbc" score poorly on long search_text with similarity() alone;
    word_similarity matches the needle in the haystack.
    """
    return queryset.annotate(
        _sim_tri=TrigramSimilarity("search_text", normalized_q),
        _sim_word=TrigramWordSimilarity(normalized_q, "search_text"),
        sim=Greatest(F("_sim_tri"), F("_sim_word"), output_field=FloatField()),
    )


def _test_candidates(normalized_q: str, cap: int) -> list[DiagnosticServiceMaster]:
    base = DiagnosticServiceMaster.objects.filter(is_active=True, deleted_at__isnull=True).select_related(
        "category"
    )
    qs = (
        _annotate_search_similarity(base, normalized_q)
        .filter(sim__gt=TRIGRAM_THRESHOLD)
        .order_by("-sim")[:cap]
    )
    return list(qs)


def _package_candidates(normalized_q: str, cap: int) -> list[DiagnosticPackage]:
    active_items = Prefetch(
        "items",
        queryset=DiagnosticPackageItem.objects.filter(deleted_at__isnull=True),
        to_attr="_prefetched_active_items",
    )
    base = DiagnosticPackage.objects.filter(
        is_active=True, is_latest=True, deleted_at__isnull=True
    ).prefetch_related(active_items)
    qs = (
        _annotate_search_similarity(base, normalized_q)
        .filter(sim__gt=TRIGRAM_THRESHOLD)
        .order_by("-sim")[:cap]
    )
    return list(qs)


def _did_you_mean(normalized_q: str) -> str | None:
    base = DiagnosticServiceMaster.objects.filter(is_active=True, deleted_at__isnull=True)
    row = _annotate_search_similarity(base, normalized_q).order_by("-sim").first()
    if row is None:
        return None
    sim = float(getattr(row, "sim", 0.0))
    if sim <= DID_YOU_MEAN_THRESHOLD:
        return None
    return row.code or row.name


def _test_count(package: DiagnosticPackage) -> int:
    items = getattr(package, "_prefetched_active_items", None)
    if items is not None:
        return len(items)
    return package.items.filter(deleted_at__isnull=True).count()


def _serialize_tests(services: list[DiagnosticServiceMaster], normalized_q: str) -> list[dict[str, Any]]:
    seen: set = set()
    scored: list[tuple[float, int, dict[str, Any]]] = []
    for svc in services:
        if svc.id in seen:
            continue
        seen.add(svc.id)
        trigram = float(getattr(svc, "sim", 0.0))
        sc = score_service(svc, normalized_q, trigram)
        payload = {
            "type": "test",
            "id": svc.code,
            "name": svc.name,
            "match_score": round(sc, 4),
            "category": category_label(svc),
            "synopsis": service_synopsis(svc),
        }
        scored.append((sc, 0, payload))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return [x[2] for x in scored]


def _serialize_packages(packages: list[DiagnosticPackage], normalized_q: str) -> list[dict[str, Any]]:
    seen: set = set()
    scored: list[tuple[float, int, dict[str, Any]]] = []
    for pkg in packages:
        if pkg.id in seen:
            continue
        seen.add(pkg.id)
        trigram = float(getattr(pkg, "sim", 0.0))
        sc = score_package(pkg, normalized_q, trigram)
        payload = {
            "type": "package",
            "id": pkg.lineage_code,
            "name": pkg.name,
            "match_score": round(sc, 4),
            "test_count": _test_count(pkg),
            "synopsis": package_synopsis(pkg),
        }
        scored.append((sc, 1, payload))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return [x[2] for x in scored]


def run_investigation_search(normalized_q: str, type_filter: str, limit: int) -> dict[str, Any]:
    cache_key = build_cache_key(normalized_q, type_filter, limit)
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    cap = limit * CANDIDATE_MULTIPLIER
    tests_out: list[dict[str, Any]] = []
    packages_out: list[dict[str, Any]] = []

    if type_filter in ("all", "test"):
        tests_raw = _test_candidates(normalized_q, cap)
        tests_out = _serialize_tests(tests_raw, normalized_q)[:limit]
    if type_filter in ("all", "package"):
        packages_raw = _package_candidates(normalized_q, cap)
        packages_out = _serialize_packages(packages_raw, normalized_q)[:limit]

    meta: dict[str, Any] = {
        "query": normalized_q,
        "total_results": len(tests_out) + len(packages_out),
    }
    if meta["total_results"] == 0:
        dym = _did_you_mean(normalized_q)
        if dym:
            meta["did_you_mean"] = dym

    payload = {"tests": tests_out, "packages": packages_out, "meta": meta}
    set_cached(cache_key, payload)
    return payload
