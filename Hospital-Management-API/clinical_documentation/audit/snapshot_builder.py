"""Snapshot builders for clinical documentation update events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_snapshot

from clinical_documentation.audit.payload_builder import ClinicalDocumentationPayloadBuilder


class ClinicalDocumentationSnapshotBuilder:
    """Builds lightweight prior-state snapshots for update audit events."""

    @staticmethod
    def build_diagnosis_snapshot(*, prior_state: dict[str, Any] | None) -> dict[str, Any]:
        prior = prior_state or {}
        snapshot = {
            "diagnosis_code": prior.get("diagnosis_code"),
            "classification": prior.get("classification"),
            "severity": prior.get("severity"),
            "is_primary": prior.get("is_primary"),
        }
        return sanitize_audit_snapshot(snapshot)

    @staticmethod
    def build_allergy_snapshot(*, prior_entry: dict[str, Any] | None) -> dict[str, Any]:
        prior = prior_entry or {}
        snapshot = {
            "allergen": prior.get("allergen"),
            "reaction": prior.get("reaction"),
            "severity": prior.get("severity"),
        }
        return sanitize_audit_snapshot(snapshot)

    @staticmethod
    def build_clinical_notes_snapshot(
        *,
        section: str,
        prior_content: str | None = None,
    ) -> dict[str, Any]:
        content = (prior_content or "").strip()
        if len(content) > 500:
            content = content[:497] + "..."
        snapshot = {
            "section": section,
            "content_preview": content or None,
        }
        return sanitize_audit_snapshot(snapshot)

    @staticmethod
    def build_diagnosis_snapshot_from_row(diagnosis_row) -> dict[str, Any]:
        state = ClinicalDocumentationPayloadBuilder.diagnosis_state_from_row(diagnosis_row)
        return ClinicalDocumentationSnapshotBuilder.build_diagnosis_snapshot(
            prior_state=state
        )
