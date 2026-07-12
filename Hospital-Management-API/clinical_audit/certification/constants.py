"""Constants for Clinical Audit certification."""

from __future__ import annotations

from clinical_audit.enums import AuditAction

# Deterministic correlation ID for fixture-driven validator tests.
CERTIFICATION_CORRELATION_ID = "cert-00000000-0000-4000-8000-000000000001"

# Canonical certification journey — 13 wired production events (M3.2–M3.6).
# Narrative order; tier-based validator allows report events before the
# consultation-complete cluster (symptoms → diagnosis → prescription → completed).
CERTIFICATION_REQUIRED_ACTIONS: tuple[AuditAction, ...] = (
    AuditAction.CONSULTATION_STARTED,
    AuditAction.SYMPTOMS_RECORDED,
    AuditAction.VITAL_SIGNS_RECORDED,
    AuditAction.DIAGNOSIS_ADDED,
    AuditAction.PRESCRIPTION_CREATED,
    AuditAction.PRESCRIPTION_SIGNED,
    AuditAction.TEST_ORDERED,
    AuditAction.RECOMMENDATION_SENT,
    AuditAction.REPORT_UPLOADED,
    AuditAction.REPORT_VIEWED,
    AuditAction.REPORT_DOWNLOADED,
    AuditAction.REPORT_SHARED,
    AuditAction.CONSULTATION_COMPLETED,
)

CERTIFICATION_EXPECTED_COUNT = len(CERTIFICATION_REQUIRED_ACTIONS)

# Tier ordering for production-achievable E2E workflows.
CERTIFICATION_ACTION_TIERS: dict[AuditAction, int] = {
    AuditAction.VITAL_SIGNS_RECORDED: 0,
    AuditAction.CONSULTATION_STARTED: 1,
    AuditAction.TEST_ORDERED: 2,
    AuditAction.RECOMMENDATION_SENT: 2,
    AuditAction.REPORT_UPLOADED: 3,
    AuditAction.REPORT_VIEWED: 3,
    AuditAction.REPORT_DOWNLOADED: 3,
    AuditAction.REPORT_SHARED: 3,
    AuditAction.SYMPTOMS_RECORDED: 4,
    AuditAction.DIAGNOSIS_ADDED: 4,
    AuditAction.PRESCRIPTION_CREATED: 4,
    AuditAction.PRESCRIPTION_SIGNED: 4,
    AuditAction.CONSULTATION_COMPLETED: 5,
}

# Pairwise precedence (earlier action must not follow later).
CERTIFICATION_PAIRWISE_ORDER: tuple[tuple[AuditAction, AuditAction], ...] = (
    (AuditAction.VITAL_SIGNS_RECORDED, AuditAction.CONSULTATION_STARTED),
    (AuditAction.CONSULTATION_STARTED, AuditAction.TEST_ORDERED),
    (AuditAction.VITAL_SIGNS_RECORDED, AuditAction.TEST_ORDERED),
    (AuditAction.TEST_ORDERED, AuditAction.RECOMMENDATION_SENT),
    (AuditAction.RECOMMENDATION_SENT, AuditAction.REPORT_UPLOADED),
    (AuditAction.REPORT_UPLOADED, AuditAction.REPORT_VIEWED),
    (AuditAction.REPORT_VIEWED, AuditAction.REPORT_DOWNLOADED),
    (AuditAction.REPORT_DOWNLOADED, AuditAction.REPORT_SHARED),
    (AuditAction.REPORT_SHARED, AuditAction.SYMPTOMS_RECORDED),
    (AuditAction.SYMPTOMS_RECORDED, AuditAction.DIAGNOSIS_ADDED),
    (AuditAction.DIAGNOSIS_ADDED, AuditAction.PRESCRIPTION_CREATED),
    (AuditAction.PRESCRIPTION_CREATED, AuditAction.PRESCRIPTION_SIGNED),
    (AuditAction.PRESCRIPTION_SIGNED, AuditAction.CONSULTATION_COMPLETED),
)

SNAPSHOT_REQUIRED_ACTIONS: frozenset[AuditAction] = frozenset(
    {
        AuditAction.DIAGNOSIS_UPDATED,
        AuditAction.ALLERGY_UPDATED,
        AuditAction.PRESCRIPTION_UPDATED,
        AuditAction.CONSULTATION_FINDINGS_UPDATED,
        AuditAction.CONSULTATION_INSTRUCTIONS_UPDATED,
        AuditAction.CONSULTATION_INVESTIGATIONS_UPDATED,
    }
)

SNAPSHOT_FORBIDDEN_ACTIONS: frozenset[AuditAction] = frozenset(
    {
        AuditAction.REPORT_VIEWED,
        AuditAction.REPORT_DOWNLOADED,
        AuditAction.REPORT_SHARED,
        AuditAction.SYMPTOMS_RECORDED,
        AuditAction.VITAL_SIGNS_RECORDED,
        AuditAction.PRESCRIPTION_DOWNLOADED,
    }
)

# Performance targets (milliseconds).
PERF_TARGET_AUDIT_WRITE_MS = 30
PERF_TARGET_TIMELINE_RECONSTRUCTION_MS = 200
PERF_TARGET_CERTIFICATION_MS = 500
