from __future__ import annotations

from typing import Any


class MedicineRanker:
    WEIGHTS = {
        "doctor": 0.4,
        "diagnosis": 0.3,
        "patient": 0.2,
        "global": 0.1,
    }

    SIGNAL_ORDER = ("doctor", "diagnosis", "patient", "global")

    @classmethod
    def normalize_by_max(cls, values: list[float]) -> list[float]:
        if not values:
            return []
        m = max(values)
        if m <= 0:
            return [0.0 for _ in values]
        return [float(v) / m for v in values]

    @classmethod
    def normalize_rank_desc(cls, n: int) -> list[float]:
        """First item (best) -> 1.0, last -> ~0 when n>1."""
        if n <= 0:
            return []
        if n == 1:
            return [1.0]
        return [1.0 - (i / (n - 1)) for i in range(n)]

    @classmethod
    def final_score(cls, components: dict[str, float]) -> float:
        return sum(
            cls.WEIGHTS[k] * float(components.get(k, 0.0))
            for k in cls.WEIGHTS
        )

    @classmethod
    def dominant_signal(cls, components: dict[str, float]) -> str:
        best = -1.0
        winner = "global"
        for key in cls.SIGNAL_ORDER:
            v = float(components.get(key, 0.0))
            if v > best:
                best = v
                winner = key
        return winner

    @classmethod
    def score_medicine_row(cls, components: dict[str, float]) -> dict[str, Any]:
        fs = cls.final_score(components)
        return {
            "components": dict(components),
            "final_score": fs,
            "dominant_signal": cls.dominant_signal(components),
        }
