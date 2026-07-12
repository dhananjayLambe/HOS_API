"""Timeline validation for Clinical Audit certification."""

from __future__ import annotations

from clinical_audit.certification.certification_result import ValidatorResult
from clinical_audit.certification.constants import (
    CERTIFICATION_ACTION_TIERS,
    CERTIFICATION_EXPECTED_COUNT,
    CERTIFICATION_PAIRWISE_ORDER,
    CERTIFICATION_REQUIRED_ACTIONS,
)
from clinical_audit.enums import AuditAction
from clinical_audit.models import ClinicalAudit


class TimelineValidator:
    """Validate completeness, uniqueness, and ordering of certification events."""

    name = "timeline"

    def validate(
        self,
        audits: list[ClinicalAudit],
        *,
        consultation_id: str | None = None,
        patient_account_id: str | None = None,
    ) -> ValidatorResult:
        errors: list[str] = []
        warnings: list[str] = []

        required_set = set(CERTIFICATION_REQUIRED_ACTIONS)
        cert_audits = [audit for audit in audits if audit.action in required_set]

        if consultation_id:
            missing_consultation = [
                audit.id
                for audit in cert_audits
                if audit.action not in {AuditAction.VITAL_SIGNS_RECORDED}
                and (audit.consultation_id or "") != str(consultation_id)
            ]
            if missing_consultation:
                errors.append(
                    f"{len(missing_consultation)} certification row(s) missing consultation_id."
                )

        if patient_account_id:
            missing_patient = [
                audit.id
                for audit in cert_audits
                if (audit.patient_account_id or "") != str(patient_account_id)
            ]
            if missing_patient:
                errors.append(
                    f"{len(missing_patient)} certification row(s) missing patient_account_id."
                )

        action_counts: dict[str, int] = {}
        for audit in cert_audits:
            action_counts[audit.action] = action_counts.get(audit.action, 0) + 1

        for action in CERTIFICATION_REQUIRED_ACTIONS:
            count = action_counts.get(action, 0)
            if count == 0:
                errors.append(f"Missing required event: {action}.")
            elif count > 1:
                errors.append(f"Duplicate event: {action} ({count} rows).")

        if len(cert_audits) != CERTIFICATION_EXPECTED_COUNT:
            errors.append(
                f"Expected {CERTIFICATION_EXPECTED_COUNT} certification events, "
                f"found {len(cert_audits)}."
            )

        sorted_audits = sorted(cert_audits, key=lambda row: row.timestamp)
        if sorted_audits:
            first_action = sorted_audits[0].action
            last_action = sorted_audits[-1].action
            if first_action not in {
                AuditAction.CONSULTATION_STARTED,
                AuditAction.VITAL_SIGNS_RECORDED,
            }:
                errors.append(
                    f"First event must be consultation.started or vitals.recorded, "
                    f"got {first_action}."
                )
            if last_action != AuditAction.CONSULTATION_COMPLETED:
                errors.append(
                    f"Last event must be {AuditAction.CONSULTATION_COMPLETED}, "
                    f"got {last_action}."
                )

        tier_positions = {
            audit.action: CERTIFICATION_ACTION_TIERS.get(audit.action, 99)
            for audit in sorted_audits
        }
        prev_tier = -1
        for audit in sorted_audits:
            tier = tier_positions.get(audit.action, 99)
            if tier < prev_tier:
                errors.append(
                    f"Invalid tier ordering: {audit.action} (tier {tier}) "
                    f"follows a higher-tier event."
                )
            prev_tier = tier

        action_time = {audit.action: audit.timestamp for audit in sorted_audits}
        for earlier, later in CERTIFICATION_PAIRWISE_ORDER:
            if earlier in action_time and later in action_time:
                if action_time[earlier] > action_time[later]:
                    errors.append(
                        f"Invalid ordering: {later} occurs before {earlier}."
                    )

        narrative_order = list(CERTIFICATION_REQUIRED_ACTIONS)
        actual_order = [audit.action for audit in sorted_audits]
        if actual_order != narrative_order:
            warnings.append(
                "Timestamp order differs from narrative timeline; "
                "tier and pairwise rules were applied."
            )

        return ValidatorResult(
            name=self.name,
            passed=not errors,
            errors=errors,
            warnings=warnings,
            metrics={
                "event_count": len(cert_audits),
                "actual_order": [str(action) for action in actual_order],
            },
        )
