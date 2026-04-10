from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.db.models import Max
from django.utils import timezone

from consultations_core.models import ClinicalEncounter, ConsultationDiagnosis, ConsultationSymptom, InvestigationItem
from diagnostics_engine.models import DiagnosticOrderItem

from .constants import RECENT_TEST_WINDOW_DAYS


@dataclass
class SuggestionContext:
    encounter: ClinicalEncounter
    doctor_id: str
    patient_id: str
    diagnosis_ids: list[str]
    symptom_ids: list[str]
    selected_test_ids: set[str]
    selected_package_ids: set[str]
    recent_test_days: dict[str, int]
    vitals: dict[str, Any]


class ContextBuilder:
    @staticmethod
    def build(encounter: ClinicalEncounter) -> SuggestionContext:
        consultation = getattr(encounter, "consultation", None)
        diagnosis_ids: list[str] = []
        symptom_ids: list[str] = []
        selected_test_ids: set[str] = set()
        selected_package_ids: set[str] = set()

        if consultation is not None:
            diagnosis_ids = [
                str(i)
                for i in ConsultationDiagnosis.objects.filter(
                    consultation=consultation,
                    is_active=True,
                    master_id__isnull=False,
                ).values_list("master_id", flat=True)
            ]
            symptom_ids = [
                str(i)
                for i in ConsultationSymptom.objects.filter(
                    consultation=consultation,
                    is_active=True,
                    symptom_id__isnull=False,
                ).values_list("symptom_id", flat=True)
            ]

            selected_rows = InvestigationItem.objects.filter(
                investigations__consultation=consultation,
                is_deleted=False,
            ).values("catalog_item_id", "diagnostic_package_id")
            for row in selected_rows:
                if row["catalog_item_id"]:
                    selected_test_ids.add(str(row["catalog_item_id"]))
                if row["diagnostic_package_id"]:
                    selected_package_ids.add(str(row["diagnostic_package_id"]))

        recent_test_days = ContextBuilder._recent_test_days(str(encounter.patient_profile_id))
        vitals = ContextBuilder._preconsult_vitals(encounter)

        return SuggestionContext(
            encounter=encounter,
            doctor_id=str(encounter.doctor_id),
            patient_id=str(encounter.patient_profile_id),
            diagnosis_ids=diagnosis_ids,
            symptom_ids=symptom_ids,
            selected_test_ids=selected_test_ids,
            selected_package_ids=selected_package_ids,
            recent_test_days=recent_test_days,
            vitals=vitals,
        )

    @staticmethod
    def _recent_test_days(patient_id: str) -> dict[str, int]:
        since = timezone.now() - timedelta(days=RECENT_TEST_WINDOW_DAYS)
        rows = (
            DiagnosticOrderItem.objects.filter(
                order__patient_profile_id=patient_id,
                service_id__isnull=False,
                created_at__gte=since,
                deleted_at__isnull=True,
            )
            .values("service_id")
            .annotate(last_at=Max("created_at"))
        )
        out: dict[str, int] = {}
        now = timezone.now()
        for row in rows:
            service_id = row["service_id"]
            last_at = row["last_at"]
            if service_id and last_at:
                out[str(service_id)] = max((now - last_at).days, 0)
        return out

    @staticmethod
    def _preconsult_vitals(encounter: ClinicalEncounter) -> dict[str, Any]:
        pre_consultation = getattr(encounter, "pre_consultation", None)
        if not pre_consultation:
            return {}
        section = getattr(pre_consultation, "vitals_section", None)
        if not section:
            return {}
        return section.data or {}

