"""Aggregation helper for consultation completion audit payloads."""

from __future__ import annotations

from dataclasses import dataclass

from consultations_core.models.diagnosis import ConsultationDiagnosis
from consultations_core.models.follow_up import FollowUp
from consultations_core.models.investigation import InvestigationItem
from consultations_core.models.prescription import Prescription


@dataclass(frozen=True)
class ConsultationCompletionStats:
    prescription_created: bool
    diagnosis_count: int
    tests_ordered: int
    follow_up_required: bool
    duration_minutes: int | None


class ConsultationStatisticsBuilder:
    """Build completion statistics with a small fixed set of aggregate queries."""

    @staticmethod
    def build_completion_stats(consultation) -> ConsultationCompletionStats:
        consultation_id = consultation.pk
        duration_minutes = None
        if consultation.started_at and consultation.ended_at:
            delta = consultation.ended_at - consultation.started_at
            duration_minutes = max(0, int(delta.total_seconds() // 60))

        return ConsultationCompletionStats(
            prescription_created=Prescription.objects.filter(
                consultation_id=consultation_id
            ).exists(),
            diagnosis_count=ConsultationDiagnosis.objects.filter(
                consultation_id=consultation_id,
                is_active=True,
            ).count(),
            tests_ordered=InvestigationItem.objects.filter(
                investigations__consultation_id=consultation_id,
                is_deleted=False,
            ).count(),
            follow_up_required=FollowUp.objects.filter(
                consultation_id=consultation_id
            ).exists(),
            duration_minutes=duration_minutes,
        )
