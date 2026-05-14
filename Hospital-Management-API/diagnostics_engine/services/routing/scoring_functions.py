"""Normalization and per-dimension scorers — keep ranking_engine free of hardcoded curves."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable

from diagnostics_engine.services.routing.scoring_weights import ScoringWeights


def _min_max(values: list[float]) -> tuple[float, float]:
    if not values:
        return 0.0, 1.0
    lo, hi = min(values), max(values)
    if hi - lo < 1e-12:
        return lo, hi
    return lo, hi


def normalize_lower_is_better(raw: list[float | None]) -> list[float]:
    """Map raw metrics (distance, price, hours) to 0..1 where 1 is best."""
    clean = [float(x) for x in raw if x is not None]
    if not clean:
        return [0.0 for _ in raw]
    lo, hi = _min_max(clean)
    out: list[float] = []
    for x in raw:
        if x is None:
            out.append(0.0)
            continue
        fx = float(x)
        if hi - lo < 1e-12:
            out.append(1.0)
        else:
            out.append((hi - fx) / (hi - lo))
    return out


@dataclass
class ScoringFunctions:
    """Pluggable scoring; swap implementations for marketplace / AI tiers."""

    weights: ScoringWeights

    def dimension_scores(
        self,
        *,
        distances_km: list[float | None],
        prices: list[Decimal | None],
        tat_hours: list[int | None],
        quality: list[float] | None = None,
        partner: list[float] | None = None,
    ) -> tuple[list[float], list[float], list[float], list[float], list[float]]:
        d_score = normalize_lower_is_better(distances_km)
        p_score = normalize_lower_is_better([float(p) if p is not None else None for p in prices])
        t_score = normalize_lower_is_better([float(t) if t is not None else None for t in tat_hours])
        n = len(d_score)
        q_score = quality if quality is not None else [0.5] * n
        pt_score = partner if partner is not None else [0.5] * n
        return d_score, p_score, t_score, q_score, pt_score

    def final_scores(
        self,
        d_score: list[float],
        p_score: list[float],
        t_score: list[float],
        q_score: list[float],
        pt_score: list[float],
    ) -> list[float]:
        w = self.weights
        out: list[float] = []
        for i in range(len(d_score)):
            out.append(
                w.distance * d_score[i]
                + w.price * p_score[i]
                + w.tat * t_score[i]
                + w.quality * q_score[i]
                + w.partner * pt_score[i]
            )
        return out
