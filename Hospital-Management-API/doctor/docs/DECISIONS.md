---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Architecture Decisions — doctor

## ADR-D001: Doctor profile separate from User

| Field | Value |
|---|---|
| Status | Accepted |
| Context | Auth vs clinical/business profile separation |
| Decision | `OneToOneField` to `account.User`; extended fields on `doctor` model |
| Consequences | All doctor APIs join user + doctor records |

## ADR-D002: KYC approval workflow

| Field | Value |
|---|---|
| Status | Accepted |
| Context | Regulatory requirement for prescribing doctors |
| Decision | `status`: pending → approved / rejected before full platform access |
| Consequences | Appointments may filter unapproved doctors |

## ADR-D003: JSON consultation_modes and languages_spoken

| Field | Value |
|---|---|
| Status | Accepted |
| Decision | Flexible arrays on profile for patient-facing search/filters |
