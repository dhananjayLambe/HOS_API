"""Workflow certification validator."""

from __future__ import annotations

from support_trace.models import SupportTrace


class WorkflowValidator:
    @classmethod
    def validate(cls) -> tuple[list[str], float]:
        warnings: list[str] = []
        total = SupportTrace.objects.count()
        if total == 0:
            return ["no support traces indexed"], 0.0
        without_corr = SupportTrace.objects.filter(correlation_id="").count()
        if without_corr:
            warnings.append(f"{without_corr} traces missing correlation_id")
        invalid_parents = 0
        for trace in SupportTrace.objects.exclude(parent_workflow_instance_id__isnull=True).exclude(
            parent_workflow_instance_id=""
        )[:200]:
            parent = trace.parent_workflow_instance_id
            if parent and not SupportTrace.objects.filter(workflow_instance_id=parent).exists():
                invalid_parents += 1
        if invalid_parents:
            warnings.append(f"{invalid_parents} traces with missing parent workflow")
        score = max(0.0, 1.0 - (len(warnings) * 0.15))
        return warnings, score
