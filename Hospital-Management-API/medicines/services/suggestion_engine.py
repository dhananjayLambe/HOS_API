from __future__ import annotations

"""
Medicine suggestion ranking.

Merge rule (per drug_id):
  • Each signal independently takes the best raw value from that source:
      doctor:    normalized usage_count among top-N doctor rows
      diagnosis: max(weight) across all matching diagnosis rows, then normalized
      patient:   normalized usage_count among top-N patient rows
      global:    rank-based score from the global candidate list (max if assigned twice)
  • Component scores are in [0, 1]. Final score = weighted sum (MedicineRanker).

Grouping:
  • Sort all candidates by final_score descending (single global ordering).
  • quick_suggestions: first min(5, limit) rows from that sorted list (not per-bucket).
  • Secondary buckets: dominant_signal (argmax) matches; each drug appears at most once
    across all buckets; total distinct drug ids in the response never exceeds self.limit.
"""

import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any

from analytics.models import DiagnosisMedicineMap, DoctorMedicineUsage, PatientMedicineUsage
from medicines.models import DrugMaster
from medicines.services.ranking import MedicineRanker

# TODO: AI-based ranking
# TODO: seasonal trends
# TODO: drug interaction warnings
# TODO: patient allergy filtering
# TODO: When DrugMaster is huge, set True to limit global candidate scan to is_common rows.
GLOBAL_RESTRICT_TO_COMMON = False

DOCTOR_FETCH_CAP = 20
PATIENT_FETCH_CAP = 20
GLOBAL_FETCH_CAP = 50
FALLBACK_GLOBAL_CAP = 10
QUICK_VISIBLE_CAP = 5
BUCKET_CAP = 3
DEFAULT_LIMIT = 10
MAX_LIMIT = 15


class MedicineSuggestionEngine:
    def __init__(
        self,
        doctor_id: uuid.UUID | str,
        patient_id: uuid.UUID | str | None = None,
        diagnosis_ids: list[uuid.UUID | str] | None = None,
        symptom_ids: list[uuid.UUID | str] | None = None,
        limit: int = DEFAULT_LIMIT,
    ):
        self.doctor_id = doctor_id
        self.patient_id = patient_id
        self.diagnosis_ids = list(diagnosis_ids or [])
        self.symptom_ids = list(symptom_ids or [])
        raw_limit = int(limit or DEFAULT_LIMIT)
        self.limit = min(max(raw_limit, 1), MAX_LIMIT)

        self._doctor_last_used: dict[uuid.UUID, datetime | None] = {}
        self._patient_last_used: dict[uuid.UUID, datetime | None] = {}
        self._drug_by_id: dict[uuid.UUID, DrugMaster] = {}

    def run(self) -> dict[str, Any]:
        merged = self._collect_signal_scores()
        if not merged:
            merged = self._fallback_global_only_scores()

        rows = self._rows_from_merged(merged)
        rows.sort(key=lambda r: r["final_score"], reverse=True)

        if not rows:
            merged = self._fallback_global_only_scores()
            rows = self._rows_from_merged(merged)
            rows.sort(key=lambda r: r["final_score"], reverse=True)

        return self._split_buckets(rows)

    def _new_scores_dict(
        self,
    ) -> dict[uuid.UUID, dict[str, float]]:
        return defaultdict(
            lambda: {"doctor": 0.0, "diagnosis": 0.0, "patient": 0.0, "global": 0.0}
        )

    def _collect_signal_scores(self) -> dict[uuid.UUID, dict[str, float]]:
        scores: dict[uuid.UUID, dict[str, float]] = self._new_scores_dict()

        self._apply_doctor_signal(scores)
        self._apply_diagnosis_signal(scores)
        self._apply_patient_signal(scores)
        self._apply_global_signal(scores)

        return scores

    def _global_drugs_query(self):
        qs = DrugMaster.objects.filter(is_active=True).select_related("formulation").order_by(
            "-is_common", "brand_name"
        )
        if GLOBAL_RESTRICT_TO_COMMON:
            qs = qs.filter(is_common=True)
        return qs

    def _fallback_global_only_scores(self) -> dict[uuid.UUID, dict[str, float]]:
        scores: dict[uuid.UUID, dict[str, float]] = self._new_scores_dict()
        drugs = list(self._global_drugs_query()[:FALLBACK_GLOBAL_CAP])
        self._apply_global_norms_for_drugs(scores, drugs)
        return scores

    def _apply_global_norms_for_drugs(
        self,
        scores: dict[uuid.UUID, dict[str, float]],
        drugs: list[DrugMaster],
    ) -> None:
        n = len(drugs)
        if n == 0:
            return
        norms = MedicineRanker.normalize_rank_desc(n)
        for i, d in enumerate(drugs):
            self._drug_by_id[d.id] = d
            prev = scores[d.id]["global"]
            scores[d.id]["global"] = max(prev, norms[i])

    def _apply_doctor_signal(self, scores: dict[uuid.UUID, dict[str, float]]) -> None:
        # deleted_at: all analytics usage/map models in this project define deleted_at — exclude soft-deleted rows.
        qs = (
            DoctorMedicineUsage.objects.filter(
                doctor_id=self.doctor_id,
                deleted_at__isnull=True,
            )
            .select_related("drug__formulation")
            .order_by("-usage_count", "-last_used_at")[:DOCTOR_FETCH_CAP]
        )
        rows = list(qs)
        raw = [float(r.usage_count or 0) for r in rows]
        norms = MedicineRanker.normalize_by_max(raw)
        for i, r in enumerate(rows):
            if r.drug_id:
                scores[r.drug_id]["doctor"] = norms[i]
                self._doctor_last_used[r.drug_id] = r.last_used_at
                if r.drug:
                    self._drug_by_id[r.drug_id] = r.drug

    def _apply_diagnosis_signal(self, scores: dict[uuid.UUID, dict[str, float]]) -> None:
        if not self.diagnosis_ids:
            return
        qs = (
            DiagnosisMedicineMap.objects.filter(
                diagnosis_id__in=self.diagnosis_ids,
                deleted_at__isnull=True,
            )
            .select_related("drug__formulation")
            .order_by("-weight")
        )
        best_weight: dict[uuid.UUID, float] = defaultdict(float)
        for m in qs:
            if m.drug_id:
                self._drug_by_id.setdefault(m.drug_id, m.drug)
            w = float(m.weight or 0.0)
            if m.drug_id and w > best_weight[m.drug_id]:
                best_weight[m.drug_id] = w
        if not best_weight:
            return
        mx = max(best_weight.values())
        for drug_id, w in best_weight.items():
            scores[drug_id]["diagnosis"] = (w / mx) if mx > 0 else 0.0

    def _apply_patient_signal(self, scores: dict[uuid.UUID, dict[str, float]]) -> None:
        if not self.patient_id:
            return
        qs = (
            PatientMedicineUsage.objects.filter(
                patient_id=self.patient_id,
                deleted_at__isnull=True,
            )
            .select_related("drug__formulation")
            .order_by("-usage_count", "-last_used_at")[:PATIENT_FETCH_CAP]
        )
        rows = list(qs)
        raw = [float(r.usage_count or 0) for r in rows]
        norms = MedicineRanker.normalize_by_max(raw)
        for i, r in enumerate(rows):
            if r.drug_id:
                scores[r.drug_id]["patient"] = norms[i]
                self._patient_last_used[r.drug_id] = r.last_used_at
                if r.drug:
                    self._drug_by_id[r.drug_id] = r.drug

    def _apply_global_signal(self, scores: dict[uuid.UUID, dict[str, float]]) -> None:
        drugs = list(self._global_drugs_query()[:GLOBAL_FETCH_CAP])
        self._apply_global_norms_for_drugs(scores, drugs)

    def _last_used_for_drug(self, drug_id: uuid.UUID) -> datetime | None:
        times: list[datetime] = []
        t = self._doctor_last_used.get(drug_id)
        if t is not None:
            times.append(t)
        if self.patient_id:
            t2 = self._patient_last_used.get(drug_id)
            if t2 is not None:
                times.append(t2)
        return max(times) if times else None

    def _rows_from_merged(
        self, merged: dict[uuid.UUID, dict[str, float]]
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        drug_ids = list(merged.keys())
        if not drug_ids:
            return rows

        missing = [i for i in drug_ids if i not in self._drug_by_id]
        if missing:
            for d in DrugMaster.objects.filter(id__in=missing, is_active=True).select_related(
                "formulation"
            ):
                self._drug_by_id[d.id] = d

        for drug_id, comp in merged.items():
            drug = self._drug_by_id.get(drug_id)
            if not drug:
                continue
            scored = MedicineRanker.score_medicine_row(comp)
            dominant = scored["dominant_signal"]
            rows.append(
                {
                    "drug": drug,
                    "final_score": scored["final_score"],
                    "components": scored["components"],
                    "dominant_signal": dominant,
                    "source": dominant,
                    "last_used_at": self._last_used_for_drug(drug_id),
                }
            )
        return rows

    def _split_buckets(self, rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        quick_n = min(QUICK_VISIBLE_CAP, self.limit)
        quick = rows[:quick_n]
        used_ids: set[uuid.UUID] = {r["drug"].id for r in quick}
        remaining = self.limit - len(used_ids)

        def take_for(dominant: str) -> list[dict[str, Any]]:
            nonlocal remaining
            out: list[dict[str, Any]] = []
            for r in rows:
                if remaining <= 0:
                    break
                if len(out) >= BUCKET_CAP:
                    break
                did = r["drug"].id
                if did in used_ids:
                    continue
                if r["dominant_signal"] != dominant:
                    continue
                out.append(r)
                used_ids.add(did)
                remaining -= 1
            return out

        return {
            "quick_suggestions": quick,
            "based_on_diagnosis": take_for("diagnosis"),
            "doctor_preferred": take_for("doctor"),
            "recent_for_patient": take_for("patient"),
            "others": take_for("global"),
        }
