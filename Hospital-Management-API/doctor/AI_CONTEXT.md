---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# doctor — AI Context



## Module Purpose

Doctor profiles, KYC, scheduling, fees, OPD status, dashboard APIs, and availability rules.

## Read First

- [docs/MODELS.md](docs/MODELS.md)
- [docs/API.md](docs/API.md)
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md)

## Main Services

Scheduling, OPD check-in/out, profile updates — see `services/` and `api/views/`.

## Important Models

`doctor`, education, specialization, fees, working hours, OPD status, KYC documents

## Business Rules

- Doctor profile linked to `account.User`
- KYC verification gates certain dashboard features
- Working hours drive appointment slot generation (with clinic/appointments)

## Do Not

- Duplicate patient or appointment ownership — consume via FK/API
