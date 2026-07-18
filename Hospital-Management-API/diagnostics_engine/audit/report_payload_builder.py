"""Payload builders for diagnostic report audit events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_payload

from diagnostics_engine.audit.constants import VIEWER_ROLE_MAP


class ReportPayloadBuilder:
    """Builds sanitized payload dicts for diagnostic report audit events."""

    @staticmethod
    def build_uploaded(
        *,
        artifact_type: str = "PDF",
        report_count: int = 1,
        verified: bool = True,
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "artifact_type": artifact_type,
                "report_count": report_count,
                "verified": verified,
            }
        )

    @staticmethod
    def build_viewed(
        *,
        viewer_role: str,
        viewer_platform: str = "Web",
        artifact_id: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "viewer_role": viewer_role,
            "viewer_platform": viewer_platform,
        }
        if artifact_id:
            payload["artifact_id"] = str(artifact_id)
        return sanitize_audit_payload(payload)

    @staticmethod
    def build_downloaded(
        *,
        download_format: str = "PDF",
        download_channel: str = "Web",
        artifact_id: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "download_format": download_format,
            "download_channel": download_channel,
        }
        if artifact_id:
            payload["artifact_id"] = str(artifact_id)
        return sanitize_audit_payload(payload)

    @staticmethod
    def build_shared(
        *,
        share_channel: str = "WhatsApp",
        recipient_type: str = "Patient",
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "share_channel": share_channel,
                "recipient_type": recipient_type,
            }
        )

    @staticmethod
    def resolve_viewer_role(user) -> str:
        if user is None or not getattr(user, "is_authenticated", False):
            return "Anonymous"
        groups = set(
            user.groups.values_list("name", flat=True)
            if hasattr(user, "groups")
            else []
        )
        for group_name, label in VIEWER_ROLE_MAP.items():
            if group_name in groups:
                return label
        return "Authenticated"

    @staticmethod
    def artifact_type_for_artifacts(artifacts) -> str:
        if not artifacts:
            return "PDF"
        first = artifacts[0]
        artifact_type = getattr(first, "artifact_type", None)
        if artifact_type is not None:
            return str(getattr(artifact_type, "value", artifact_type) or "PDF")
        return "PDF"

    @staticmethod
    def share_channel_label(channel: str | None) -> str:
        normalized = (channel or "WHATSAPP").strip().upper()
        if normalized == "EMAIL":
            return "Email"
        if normalized == "SMS":
            return "SMS"
        return "WhatsApp"
