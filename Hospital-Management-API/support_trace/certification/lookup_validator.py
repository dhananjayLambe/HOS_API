"""Lookup investigation certification validator."""

from __future__ import annotations

from support_trace.lookup import TraceLookupService
from support_trace.lookup.certification import InvestigationCertification


class LookupValidator:
    @classmethod
    def validate(cls, workflow_id: str | None) -> tuple[list[str], float]:
        if not workflow_id:
            return ["no workflow for lookup validation"], 0.0
        result = TraceLookupService.lookup_by_workflow(workflow_id)
        warnings = InvestigationCertification.validate(result)
        score = 1.0 if not warnings else max(0.0, 1.0 - len(warnings) * 0.1)
        return list(warnings), score
