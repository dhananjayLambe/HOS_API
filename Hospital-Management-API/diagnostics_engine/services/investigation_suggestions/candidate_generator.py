from __future__ import annotations

from dataclasses import dataclass, field

from django.db.models import Count

from diagnostics_engine.models import DiagnosticOrderItem, DiagnosticServiceMaster


@dataclass
class Candidate:
    test_id: str
    name: str
    category_id: str | None
    doctor_usage: float = 0.0
    global_usage: float = 0.0
    diagnosis_match: float = 0.0
    symptom_match: float = 0.0
    protocol_match: float = 0.0
    recency_penalty: float = 0.0
    score: float = 0.0
    confidence: float = 0.0
    mandatory: bool = False
    reasons: list[str] = field(default_factory=list)


class CandidateGenerator:
    DOCTOR_FETCH_CAP = 50
    GLOBAL_FETCH_CAP = 100

    @classmethod
    def generate(
        cls,
        doctor_id: str,
    ) -> dict[str, Candidate]:
        active_services = (
            DiagnosticServiceMaster.objects.filter(is_active=True, deleted_at__isnull=True)
            .select_related("category")
            .only("id", "name", "category_id")
        )
        service_map: dict[str, Candidate] = {
            str(s.id): Candidate(test_id=str(s.id), name=s.name, category_id=str(s.category_id) if s.category_id else None)
            for s in active_services
        }
        if not service_map:
            return {}

        doctor_rows = (
            DiagnosticOrderItem.objects.filter(
                order__doctor_id=doctor_id,
                service_id__isnull=False,
                deleted_at__isnull=True,
            )
            .values("service_id")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")[: cls.DOCTOR_FETCH_CAP]
        )
        cls._apply_usage_norm(service_map, doctor_rows, "doctor_usage")

        global_rows = (
            DiagnosticOrderItem.objects.filter(
                service_id__isnull=False,
                deleted_at__isnull=True,
            )
            .values("service_id")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")[: cls.GLOBAL_FETCH_CAP]
        )
        cls._apply_usage_norm(service_map, global_rows, "global_usage")
        return service_map

    @staticmethod
    def _apply_usage_norm(
        service_map: dict[str, Candidate],
        usage_rows,
        attr_name: str,
    ) -> None:
        rows = list(usage_rows)
        if not rows:
            return
        max_cnt = max(float(r["cnt"] or 0.0) for r in rows) or 1.0
        for row in rows:
            sid = row["service_id"]
            if not sid:
                continue
            key = str(sid)
            cand = service_map.get(key)
            if not cand:
                continue
            setattr(cand, attr_name, float(row["cnt"] or 0.0) / max_cnt)

