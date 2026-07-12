"""Payload and snapshot validation for Clinical Audit certification."""

from __future__ import annotations

import json
import re
from typing import Any

from clinical_audit.certification.certification_result import ValidatorResult
from clinical_audit.certification.constants import (
    CERTIFICATION_REQUIRED_ACTIONS,
    SNAPSHOT_FORBIDDEN_ACTIONS,
    SNAPSHOT_REQUIRED_ACTIONS,
)
from clinical_audit.enums import AuditAction
from clinical_audit.constants import META_KEY, PAYLOAD_KEY
from clinical_audit.domain.utils import FORBIDDEN_PAYLOAD_KEYS, FORBIDDEN_PAYLOAD_PATTERNS
from clinical_audit.models import ClinicalAudit


class PayloadValidator:
    """Validate required metadata, JSON safety, and sanitization rules."""

    name = "payload"

    def validate(self, audits: list[ClinicalAudit]) -> ValidatorResult:
        errors: list[str] = []

        for audit in audits:
            prefix = f"{audit.action} ({audit.id})"

            if not audit.event:
                errors.append(f"{prefix}: missing event label.")
            if not audit.action:
                errors.append(f"{prefix}: missing action.")
            if not audit.user_id:
                errors.append(f"{prefix}: missing user_id (actor).")
            if not audit.patient_account_id:
                errors.append(f"{prefix}: missing patient_account_id.")
            if not audit.consultation_id and audit.action not in {
                AuditAction.VITAL_SIGNS_RECORDED,
            }:
                errors.append(f"{prefix}: missing consultation_id.")
            if not audit.resource_type:
                errors.append(f"{prefix}: missing resource_type.")
            if not audit.resource_id:
                errors.append(f"{prefix}: missing resource_id.")

            self._validate_json_field(audit.new_value, f"{prefix}.new_value", errors)
            if audit.previous_value is not None:
                self._validate_json_field(
                    audit.previous_value, f"{prefix}.previous_value", errors
                )

            action = audit.action
            if action in SNAPSHOT_REQUIRED_ACTIONS and audit.previous_value is None:
                errors.append(f"{prefix}: snapshot required but previous_value is null.")
            if action in SNAPSHOT_FORBIDDEN_ACTIONS and audit.previous_value is not None:
                errors.append(f"{prefix}: snapshot forbidden but previous_value is set.")

            org_id = self._organization_id(audit.new_value)
            if not org_id:
                errors.append(f"{prefix}: missing organization_id in new_value metadata.")

            self._scan_forbidden_content(audit.new_value, prefix, errors)
            if audit.previous_value:
                self._scan_forbidden_content(audit.previous_value, prefix, errors)

        return ValidatorResult(name=self.name, passed=not errors, errors=errors)

    def _validate_json_field(
        self, value: Any, field_name: str, errors: list[str]
    ) -> None:
        if value is None:
            return
        if not isinstance(value, dict):
            errors.append(f"{field_name} must be a JSON object.")
            return
        try:
            json.dumps(value)
        except (TypeError, ValueError):
            errors.append(f"{field_name} is not JSON serializable.")

    def _organization_id(self, new_value: dict[str, Any] | None) -> str | None:
        if not isinstance(new_value, dict):
            return None
        meta = new_value.get(META_KEY)
        if not isinstance(meta, dict):
            return None
        org_id = meta.get("organization_id")
        return str(org_id) if org_id else None

    def _scan_forbidden_content(
        self, payload: dict[str, Any] | None, prefix: str, errors: list[str]
    ) -> None:
        if not isinstance(payload, dict):
            return
        self._walk(payload, prefix, errors)

    def _walk(self, value: Any, prefix: str, errors: list[str], key_path: str = "") -> None:
        if isinstance(value, dict):
            for key, nested in value.items():
                path = f"{key_path}.{key}" if key_path else key
                if key.lower() in FORBIDDEN_PAYLOAD_KEYS:
                    errors.append(f"{prefix}: forbidden key {path}.")
                self._walk(nested, prefix, errors, path)
        elif isinstance(value, list):
            for index, item in enumerate(value):
                self._walk(item, prefix, errors, f"{key_path}[{index}]")
        elif isinstance(value, str):
            for pattern in FORBIDDEN_PAYLOAD_PATTERNS:
                if pattern.search(value):
                    errors.append(f"{prefix}: forbidden content pattern at {key_path}.")
                    break
