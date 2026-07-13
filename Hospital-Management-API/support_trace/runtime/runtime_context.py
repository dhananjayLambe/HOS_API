"""Build RuntimeContext from resolved sources."""

from __future__ import annotations

from datetime import datetime, timezone

from support_trace.runtime.types import RuntimeContext


class RuntimeContextBuilder:
    @classmethod
    def build(cls, **fields) -> RuntimeContext:
        known = {f.name for f in RuntimeContext.__dataclass_fields__.values()}
        filtered = {k: v for k, v in fields.items() if k in known and v is not None}
        if "captured_at" not in filtered:
            filtered["captured_at"] = datetime.now(timezone.utc)
        return RuntimeContext(**filtered)
