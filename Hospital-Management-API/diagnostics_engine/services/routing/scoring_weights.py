"""Injectable routing score weights (city/campaign/tier overrides later)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.conf import settings


@dataclass(frozen=True)
class ScoringWeights:
    distance: float = 0.35
    price: float = 0.35
    tat: float = 0.25
    quality: float = 0.025
    partner: float = 0.025

    @classmethod
    def from_django_settings(cls) -> ScoringWeights:
        raw: dict[str, Any] = getattr(settings, "DIAGNOSTICS_ROUTING_SCORING_WEIGHTS", {}) or {}
        return cls(
            distance=float(raw.get("distance", 0.35)),
            price=float(raw.get("price", 0.35)),
            tat=float(raw.get("tat", 0.25)),
            quality=float(raw.get("quality", 0.025)),
            partner=float(raw.get("partner", 0.025)),
        )
