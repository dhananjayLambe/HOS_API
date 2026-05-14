"""Rank eligible labs using injected ScoringWeights + ScoringFunctions."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING

from diagnostics_engine.choices.routing import RecommendationLabel
from diagnostics_engine.services.routing.eligibility_engine import EligibilityCandidate
from diagnostics_engine.services.routing.scoring_functions import ScoringFunctions
from diagnostics_engine.services.routing.scoring_weights import ScoringWeights

if TYPE_CHECKING:
    pass


@dataclass
class RankedLab:
    candidate: EligibilityCandidate
    distance_score: Decimal
    price_score: Decimal
    tat_score: Decimal
    quality_score: Decimal
    partner_score: Decimal
    final_score: Decimal
    recommendation_labels: list[str]


def _d(val: float) -> Decimal:
    return Decimal(str(round(val, 4)))


class RankingEngine:
    @classmethod
    def rank(
        cls,
        candidates: list[EligibilityCandidate],
        *,
        weights: ScoringWeights | None = None,
    ) -> list[RankedLab]:
        if not candidates:
            return []
        w = weights or ScoringWeights.from_django_settings()
        funcs = ScoringFunctions(w)

        distances = [c.distance_km for c in candidates]
        prices = [c.estimated_price for c in candidates]
        tats = [c.estimated_tat_hours for c in candidates]

        d_s, p_s, t_s, q_s, pt_s = funcs.dimension_scores(
            distances_km=distances,
            prices=prices,
            tat_hours=tats,
        )
        finals = funcs.final_scores(d_s, p_s, t_s, q_s, pt_s)

        min_price = min((float(p) for p in prices if p is not None), default=None)
        min_tat = min((t for t in tats if t is not None), default=None)
        min_dist = min((d for d in distances if d is not None), default=None)
        max_final = max(finals) if finals else 0.0
        eps = 1e-6

        ranked: list[RankedLab] = []
        for i, c in enumerate(candidates):
            labels: list[str] = []
            if min_price is not None and c.estimated_price is not None:
                if abs(float(c.estimated_price) - min_price) <= eps:
                    labels.append(RecommendationLabel.CHEAPEST)
            if min_tat is not None and c.estimated_tat_hours is not None:
                if abs(float(c.estimated_tat_hours) - min_tat) <= eps:
                    labels.append(RecommendationLabel.FASTEST)
            if min_dist is not None and c.distance_km is not None:
                if abs(float(c.distance_km) - min_dist) <= eps:
                    labels.append(RecommendationLabel.NEAREST)
            if abs(finals[i] - max_final) <= eps:
                labels.append(RecommendationLabel.RECOMMENDED)
                labels.append(RecommendationLabel.BEST_VALUE)

            # de-dupe preserve order
            seen: set[str] = set()
            uniq = []
            for lb in labels:
                if lb not in seen:
                    seen.add(lb)
                    uniq.append(lb)

            ranked.append(
                RankedLab(
                    candidate=c,
                    distance_score=_d(d_s[i]),
                    price_score=_d(p_s[i]),
                    tat_score=_d(t_s[i]),
                    quality_score=_d(q_s[i]),
                    partner_score=_d(pt_s[i]),
                    final_score=_d(finals[i]),
                    recommendation_labels=uniq,
                )
            )

        ranked.sort(key=lambda r: float(r.final_score), reverse=True)
        return ranked
