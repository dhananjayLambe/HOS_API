from __future__ import annotations

from diagnostics_engine.models import DiagnosticPackage

from .candidate_generator import Candidate
from .constants import MIN_PACKAGE_MATCH_PERCENT


class ResponseBuilder:
    @staticmethod
    def build_tests(rows: list[Candidate]) -> list[dict]:
        out: list[dict] = []
        for c in rows:
            if c.score > 0.75:
                label = "Highly Recommended"
            elif c.score >= 0.5:
                label = "Recommended"
            else:
                label = "Optional"
            out.append(
                {
                    "id": c.test_id,
                    "name": c.name,
                    "score": round(c.score, 4),
                    "confidence": round(c.confidence, 2),
                    "confidence_label": label,
                    "reason": c.reasons[0] if c.reasons else "Suggested",
                    "badges": ["recently_done"] if "Recently done" in c.reasons else [],
                }
            )
        return out

    @staticmethod
    def build_recommended_packages(
        selected_test_ids: set[str],
        *,
        max_packages: int,
        max_package_size: int,
    ) -> list[dict]:
        packages = (
            DiagnosticPackage.objects.filter(is_active=True, is_latest=True, deleted_at__isnull=True)
            .prefetch_related("items__service")
            .order_by("-is_featured", "-priority_score", "name")
        )
        out = []
        for package in packages:
            item_ids = [str(item.service_id) for item in package.items.all() if item.service_id]
            if not item_ids or len(item_ids) > max_package_size:
                continue
            overlap = len(selected_test_ids.intersection(item_ids))
            if overlap == 0:
                continue
            pct = overlap / len(item_ids)
            if pct < MIN_PACKAGE_MATCH_PERCENT:
                continue
            missing = [item.service.name for item in package.items.all() if str(item.service_id) not in selected_test_ids]
            out.append(
                {
                    "id": str(package.id),
                    "name": package.name,
                    "completion": f"{overlap}/{len(item_ids)}",
                    "missing_tests": missing[:5],
                }
            )
            if len(out) >= max_packages:
                break
        return out

    @staticmethod
    def build_popular_packages(*, max_packages: int) -> list[dict]:
        rows = DiagnosticPackage.objects.filter(
            is_active=True,
            is_latest=True,
            deleted_at__isnull=True,
        ).order_by("-package_popularity_score", "-is_featured", "name")[:max_packages]
        return [{"id": str(i.id), "name": i.name} for i in rows]

