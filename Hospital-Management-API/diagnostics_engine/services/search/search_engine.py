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
        queryset=DiagnosticPackageItem.objects.filter(deleted_at__isnull=True)
        .select_related("service")
        .order_by("display_order", "service__name"),
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


def _service_codes_for_package(package: DiagnosticPackage) -> list[str]:
    items = getattr(package, "_prefetched_active_items", None)
    if items is None:
        items = list(
            package.items.filter(deleted_at__isnull=True)
            .select_related("service")
            .order_by("display_order", "service__name")
        )
    codes: list[str] = []
    for pi in items:
        svc = getattr(pi, "service", None)
        if svc and svc.code:
            codes.append(svc.code)
    return codes


def _serialize_tests(services: list[DiagnosticServiceMaster], normalized_q: str) -> list[dict[str, Any]]:
    seen: set = set()
    scored: list[tuple[float, int, dict[str, Any]]] = []
    for svc in services:
        if svc.id in seen:
            continue
        seen.add(svc.id)
        trigram = float(getattr(svc, "sim", 0.0))
        sc = score_service(svc, normalized_q, trigram)
        prep = (svc.preparation_notes or "").strip()
        payload = {
            "type": "test",
            "id": str(svc.id),
            "code": svc.code,
            "name": svc.name,
            "match_score": round(sc, 4),
            "category": category_label(svc),
            "synopsis": service_synopsis(svc),
            "sample_type": (svc.sample_type or "").strip(),
            "tat_hours_default": int(svc.tat_hours_default),
            "preparation_notes": prep,
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
            "id": str(pkg.id),
            "lineage_code": pkg.lineage_code,
            "name": pkg.name,
            "match_score": round(sc, 4),
            "test_count": _test_count(pkg),
            "service_codes": _service_codes_for_package(pkg),
            "synopsis": package_synopsis(pkg),
        }
        scored.append((sc, 1, payload))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return [x[2] for x in scored]


def _build_unified_results(tests_out: list[dict[str, Any]], packages_out: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flatten tests + packages sorted by match_score (desc), then tests before packages on tie."""
    combined: list[tuple[float, int, dict[str, Any]]] = []
    for t in tests_out:
        combined.append(
            (
                float(t.get("match_score") or 0.0),
                0,
                {
                    "id": t["id"],
                    "name": t["name"],
                    "type": "test",
                    "test_count": None,
                },
            )
        )
    for p in packages_out:
        combined.append(
            (
                float(p.get("match_score") or 0.0),
                1,
                {
                    "id": p["id"],
                    "name": p["name"],
                    "type": "package",
                    "test_count": p.get("test_count"),
                },
            )
        )
    combined.sort(key=lambda x: (-x[0], x[1]))
    return [x[2] for x in combined]


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

    results = _build_unified_results(tests_out, packages_out)
    payload = {"tests": tests_out, "packages": packages_out, "results": results, "meta": meta}
    set_cached(cache_key, payload)
    return payload
