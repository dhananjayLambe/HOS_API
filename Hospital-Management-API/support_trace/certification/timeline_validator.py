"""Timeline certification validator."""

from __future__ import annotations

from support_trace.lookup import TraceLookupService
from support_trace.timeline.certification import TimelineCertification


class TimelineValidator:
    @classmethod
    def validate(cls, workflow_id: str | None) -> tuple[list[str], float]:
        if not workflow_id:
            return ["no workflow for timeline validation"], 0.0
        result = TraceLookupService.lookup_by_workflow(workflow_id)
        warnings: list[str] = []
        if result.timeline:
            warnings.extend(TimelineCertification.validate(result.timeline.result))
        else:
            warnings.append("timeline not built for workflow")
        score = 1.0 if not warnings else max(0.0, 1.0 - len(warnings) * 0.1)
        return warnings, score
