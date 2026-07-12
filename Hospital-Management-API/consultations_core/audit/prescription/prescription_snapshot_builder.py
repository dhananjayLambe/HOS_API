"""Snapshot builders for prescription update audit events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_snapshot


class PrescriptionSnapshotBuilder:
    """Builds lightweight prior-state snapshots for prescription updates."""

    @staticmethod
    def build_prescription_snapshot(*, prior_state: dict[str, Any] | None) -> dict[str, Any]:
        prior = prior_state or {}
        snapshot = {
            "medicine_count": prior.get("medicine_count"),
            "status": prior.get("status"),
            "version_number": prior.get("version_number"),
            "lines": prior.get("lines"),
        }
        return sanitize_audit_snapshot(snapshot)

    @staticmethod
    def build_line_metadata_snapshot(lines) -> list[dict[str, Any]]:
        metadata: list[dict[str, Any]] = []
        for line in lines[:32]:
            drug = getattr(line, "drug", None)
            custom = getattr(line, "custom_medicine", None)
            metadata.append(
                {
                    "drug_code": getattr(drug, "code", None) if drug else None,
                    "name": (
                        getattr(line, "drug_name_snapshot", None)
                        or (getattr(custom, "name", None) if custom else None)
                    ),
                    "dose_value": getattr(line, "dose_value", None),
                    "duration_value": getattr(line, "duration_value", None),
                    "duration_unit": getattr(line, "duration_unit", None),
                }
            )
        return metadata
