"""Data integrity certification validator."""

from __future__ import annotations

from support_trace.models import SupportTrace


class IntegrityValidator:
    @classmethod
    def validate(cls) -> tuple[list[str], float]:
        warnings: list[str] = []
        seen: set[str] = set()
        dupes = 0
        for wf_id in SupportTrace.objects.values_list("workflow_instance_id", flat=True)[:500]:
            if wf_id in seen:
                dupes += 1
            seen.add(wf_id)
        if dupes:
            warnings.append(f"duplicate workflow_instance_id entries: {dupes}")
        orphans = 0
        for trace in SupportTrace.objects.exclude(parent_workflow_instance_id__isnull=True).exclude(
            parent_workflow_instance_id=""
        )[:200]:
            if not SupportTrace.objects.filter(
                workflow_instance_id=trace.parent_workflow_instance_id
            ).exists():
                orphans += 1
        if orphans:
            warnings.append(f"orphan parent references: {orphans}")
        score = 1.0 if not warnings else max(0.0, 1.0 - len(warnings) * 0.2)
        return warnings, score
