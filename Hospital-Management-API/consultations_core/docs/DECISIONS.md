---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Architecture Decisions — consultations_core

## ADR-C001: Encounter as single source of truth

| Field | Value |
|---|---|
| Status | Accepted |
| Decision | `Encounter.status` drives UX; never infer from form completeness |
| References | `support_documents/consultaiton_all_details.txt` |

## ADR-C002: Strict forward-only state machine

| Field | Value |
|---|---|
| Status | Accepted |
| Decision | `EncounterStateMachine.ALLOWED_TRANSITIONS` — no rollback |
| Consequences | Invalid transitions raise ValidationError |

## ADR-C003: One visit = one encounter

| Field | Value |
|---|---|
| Status | Accepted |
| Decision | Resume active encounter instead of creating duplicates |

## ADR-C004: Unified consultation tagging

| Field | Value |
|---|---|
| Status | Accepted |
| References | `HOS_API/docs/backend/Hospital-Management-API/UNIFIED_CONSULTATION_TAGGING_STANDARD.md` |
