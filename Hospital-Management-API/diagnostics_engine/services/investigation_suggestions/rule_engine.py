from __future__ import annotations

from diagnostics_engine.models import DiagnosisTestMapping, SymptomTestMapping

from .candidate_generator import Candidate


class RuleEngine:
    @staticmethod
    def apply(
        candidates: dict[str, Candidate],
        diagnosis_ids: list[str],
        symptom_ids: list[str],
    ) -> None:
        if diagnosis_ids:
            rows = DiagnosisTestMapping.objects.filter(
                diagnosis_id__in=diagnosis_ids,
                is_active=True,
                service_id__in=list(candidates.keys()),
            ).values("service_id", "rule_type", "weight")
            for row in rows:
                sid = str(row["service_id"])
                cand = candidates.get(sid)
                if not cand:
                    continue
                cand.diagnosis_match = 1.0
                cand.protocol_match = max(cand.protocol_match, min(float(row["weight"] or 0.0) / 2.0, 1.0))
                if row["rule_type"] == "required":
                    cand.mandatory = True
                    cand.reasons.append("Mandatory by diagnosis protocol")
                elif row["rule_type"] == "recommended":
                    cand.reasons.append("Based on diagnosis")

        if symptom_ids:
            rows = SymptomTestMapping.objects.filter(
                symptom_id__in=symptom_ids,
                is_active=True,
                service_id__in=list(candidates.keys()),
            ).values("service_id", "rule_type", "weight")
            for row in rows:
                sid = str(row["service_id"])
                cand = candidates.get(sid)
                if not cand:
                    continue
                cand.symptom_match = 1.0
                cand.protocol_match = max(cand.protocol_match, min(float(row["weight"] or 0.0) / 2.0, 1.0))
                if row["rule_type"] == "required":
                    cand.mandatory = True
                    cand.reasons.append("Mandatory by symptom protocol")
                elif row["rule_type"] == "recommended":
                    cand.reasons.append("Based on symptoms")

