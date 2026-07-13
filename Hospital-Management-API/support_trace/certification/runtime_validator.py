"""Runtime metadata certification validator."""

from __future__ import annotations

from support_trace.models import SupportTrace


class RuntimeValidator:
    @classmethod
    def validate(cls, workflow_id: str | None) -> tuple[list[str], float]:
        if not workflow_id:
            return ["no workflow for runtime validation"], 0.0
        trace = SupportTrace.objects.filter(workflow_instance_id=workflow_id).first()
        if trace is None:
            return ["workflow trace not found"], 0.0
        warnings: list[str] = []
        meta = trace.runtime_metadata or {}
        if not meta:
            warnings.append("runtime_metadata empty")
        if trace.request_id and not meta.get("request_id") and not trace.request_id:
            warnings.append("request_id not captured")
        if meta.get("cloudwatch_url") and not str(meta["cloudwatch_url"]).startswith("https://"):
            warnings.append("invalid cloudwatch_url format")
        score = 1.0 if not warnings else max(0.0, 1.0 - len(warnings) * 0.2)
        return warnings, score
