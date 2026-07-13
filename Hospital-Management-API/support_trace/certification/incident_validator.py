"""Incident reconstruction certification validator."""

from __future__ import annotations

from support_trace.incident import IncidentReconstructionService, ReconstructionLevel
from support_trace.incident.certification import IncidentCertification


class IncidentValidator:
    @classmethod
    def validate(cls, booking_id: str | None) -> tuple[list[str], float]:
        if not booking_id:
            return ["no booking for incident validation"], 0.0
        report = IncidentReconstructionService.reconstruct_booking(
            booking_id, level=ReconstructionLevel.DEEP
        )
        warnings = IncidentCertification.validate(report)
        score = 1.0 if not warnings else max(0.0, 1.0 - len(warnings) * 0.1)
        return list(warnings), score
