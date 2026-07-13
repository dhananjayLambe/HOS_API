"""API envelope certification validator."""

from __future__ import annotations

from support_trace.api.response_builder import API_VERSION


class ApiValidator:
    REQUIRED_ENVELOPE_KEYS = ("success", "request_id", "data", "metadata")

    @classmethod
    def validate_envelope(cls, payload: dict) -> tuple[list[str], float]:
        warnings: list[str] = []
        for key in cls.REQUIRED_ENVELOPE_KEYS:
            if key not in payload:
                warnings.append(f"envelope missing {key}")
        metadata = payload.get("metadata") or {}
        if metadata and metadata.get("api_version") != API_VERSION:
            warnings.append("unexpected api_version")
        if metadata and not metadata.get("investigation_id"):
            warnings.append("missing investigation_id in metadata")
        score = 1.0 if not warnings else max(0.0, 1.0 - len(warnings) * 0.25)
        return warnings, score
