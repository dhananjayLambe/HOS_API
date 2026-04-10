from __future__ import annotations

from .candidate_generator import Candidate
from .constants import MANDATORY_MIN_SCORE, SCORE_WEIGHTS, STRONG_RECENCY_DAYS


class Ranker:
    @staticmethod
    def score(
        candidates: dict[str, Candidate],
        selected_test_ids: set[str],
        recent_test_days: dict[str, int],
    ) -> list[Candidate]:
        doctor_signal_max = max((c.doctor_usage for c in candidates.values()), default=0.0)
        doctor_signal_is_cold = doctor_signal_max < 0.2

        for cand in candidates.values():
            cand.recency_penalty = Ranker._recency_penalty(recent_test_days.get(cand.test_id))
            clinical_match = Ranker._clinical_match(cand)

            doctor_weight = SCORE_WEIGHTS["doctor"]
            global_weight = SCORE_WEIGHTS["global"]
            if doctor_signal_is_cold:
                doctor_weight = 0.1
                global_weight = 0.4

            score = (
                SCORE_WEIGHTS["clinical"] * clinical_match
                + doctor_weight * cand.doctor_usage
                + global_weight * cand.global_usage
                + SCORE_WEIGHTS["recency"] * cand.recency_penalty
            )
            if cand.test_id in selected_test_ids:
                score -= 0.5
                cand.reasons.append("Already selected")
            if cand.recency_penalty < 0:
                cand.reasons.append("Recently done")

            if cand.mandatory:
                score = max(score, MANDATORY_MIN_SCORE)

            cand.score = max(min(score, 1.0), 0.0)
            cand.confidence = min(cand.score * 100.0, 100.0)
            if not cand.reasons:
                cand.reasons.append("Popular choice")

        return sorted(
            candidates.values(),
            key=lambda c: (0 if c.mandatory else 1, -c.score, -c.doctor_usage, -c.global_usage),
        )

    @staticmethod
    def _clinical_match(cand: Candidate) -> float:
        return min((cand.diagnosis_match + cand.symptom_match + cand.protocol_match) / 3.0, 1.0)

    @staticmethod
    def _recency_penalty(days_since: int | None) -> float:
        if days_since is None:
            return 0.0
        if days_since < STRONG_RECENCY_DAYS:
            return -1.0
        if days_since < 7:
            return -0.4
        return 0.0

