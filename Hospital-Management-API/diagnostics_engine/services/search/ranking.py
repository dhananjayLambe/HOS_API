from __future__ import annotations

from dataclasses import dataclass

from diagnostics_engine.models import DiagnosticPackage, DiagnosticServiceMaster


def _norm_component(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


@dataclass
class RankedTest:
    service: DiagnosticServiceMaster
    match_score: float


@dataclass
class RankedPackage:
    package: DiagnosticPackage
    match_score: float
    test_count: int


def _synonym_hit(service: DiagnosticServiceMaster, q: str) -> bool:
    q = q.lower()
    for s in service.synonyms or []:
        if not s:
            continue
        if str(s).strip().lower() == q:
            return True
    return False


def _prefix_hit(service: DiagnosticServiceMaster, q: str) -> bool:
    q = q.lower()
    if service.code and service.code.lower().startswith(q):
        return True
    if service.short_name and service.short_name.lower().startswith(q):
        return True
    if service.name and service.name.lower().startswith(q):
        return True
    return False


def _exact_hit(service: DiagnosticServiceMaster, q: str) -> bool:
    q = q.lower()
    if service.code and service.code.lower() == q:
        return True
    if service.name and service.name.strip().lower() == q:
        return True
    return False


def score_service(service: DiagnosticServiceMaster, q: str, trigram_sim: float) -> float:
    prefix_m = 1.0 if _prefix_hit(service, q) else 0.0
    trigram_m = _norm_component(trigram_sim)
    pop_m = _norm_component(service.popularity_score)
    doc_m = _norm_component(service.doctor_usage_score)
    base = 0.5 * prefix_m + 0.3 * trigram_m + 0.1 * pop_m + 0.1 * doc_m
    if _exact_hit(service, q):
        base += 0.3
    if prefix_m:
        base += 0.2
    if _synonym_hit(service, q):
        base += 0.15
    return max(0.0, min(1.0, base))


def score_package(package: DiagnosticPackage, q: str, trigram_sim: float) -> float:
    prefix_m = 0.0
    ql = q.lower()
    if package.lineage_code and package.lineage_code.lower().startswith(ql):
        prefix_m = 1.0
    elif package.name and package.name.lower().startswith(ql):
        prefix_m = 1.0
    trigram_m = _norm_component(trigram_sim)
    try:
        pop_raw = float(package.package_popularity_score or 0)
    except (TypeError, ValueError):
        pop_raw = 0.0
    pop_m = _norm_component(pop_raw)
    doc_m = 0.0
    base = 0.5 * prefix_m + 0.3 * trigram_m + 0.1 * pop_m + 0.1 * doc_m
    if package.lineage_code and package.lineage_code.lower() == ql:
        base += 0.3
    if package.name and package.name.strip().lower() == ql:
        base += 0.3
    base = max(0.0, min(1.0, base))
    return base * 0.95


def service_synopsis(service: DiagnosticServiceMaster) -> str:
    if service.synopsis:
        return service.synopsis
    if service.preparation_notes:
        return service.preparation_notes[:500]
    return ""


def package_synopsis(package: DiagnosticPackage) -> str:
    if package.description:
        return package.description[:500]
    return ""


def category_label(service: DiagnosticServiceMaster) -> str:
    if service.category_id and service.category:
        return service.category.name
    return ""
