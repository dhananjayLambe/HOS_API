from __future__ import annotations

from .candidate_generator import Candidate


class PostProcessor:
    @staticmethod
    def apply_diversity_and_limits(
        ranked: list[Candidate],
        *,
        max_per_category: int,
        max_recommended: int,
    ) -> list[Candidate]:
        out: list[Candidate] = []
        per_category: dict[str, int] = {}
        for cand in ranked:
            cat = cand.category_id or "uncategorized"
            used = per_category.get(cat, 0)
            if used >= max_per_category:
                continue
            out.append(cand)
            per_category[cat] = used + 1
            if len(out) >= max_recommended:
                break
        return out

