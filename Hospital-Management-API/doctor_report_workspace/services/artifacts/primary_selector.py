"""Primary artifact selection — in-memory, storage-agnostic."""

from __future__ import annotations

from typing import Any, Sequence


class PrimaryArtifactSelector:
    """Select which artifact is primary for presentation.

    Priority:
    1. First with is_primary=True
    2. Newest by uploaded_at (nulls last)
    3. First in input order
    """

    @classmethod
    def select(cls, artifacts: Sequence[Any]) -> Any | None:
        if not artifacts:
            return None

        for artifact in artifacts:
            if bool(getattr(artifact, "is_primary", False)):
                return artifact

        def _uploaded_key(a: Any):
            ts = getattr(a, "uploaded_at", None)
            # Sort descending: missing timestamps sort last
            return (ts is not None, ts or 0)

        newest = max(artifacts, key=_uploaded_key)
        if getattr(newest, "uploaded_at", None) is not None:
            return newest

        return artifacts[0]
