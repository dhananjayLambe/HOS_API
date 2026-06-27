---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Backend Architecture Overview

DoctorProCare EMR backend — Django 3.x + DRF + SimpleJWT + Channels + Celery + PostgreSQL + Redis.

## App tiers

| Tier | Apps | Role |
|---|---|---|
| 1 — Core domain | consultations_core, diagnostics_engine, doctor, labs | Clinical + diagnostics |
| 2 — Supporting | appointments, patient_account, clinic, queue_management, medicines, notifications | Scheduling, identity, delivery |
| 3 — Admin/ops | hospitalAdmin, hospital_mgmt, helpdesk, support, reports, tasks | Operations |
| 4 — Infra/legacy | account, core, analytics, consultation_config, patient, caleder_events | Auth, shared, legacy |

## API prefix map

| Prefix | App |
|---|---|
| `/api/auth/` | account |
| `/api/consultations/`, `/api/v1/visits/`, `/api/v1/prescriptions/` | consultations_core |
| `/api/diagnostics/`, `/api/v1/diagnostics/` | diagnostics_engine |
| `/api/labs/` | labs |
| `/api/appointments/` | appointments |
| `/api/patients/` | patient_account |
| `/api/notifications/` | notifications |

Full routing: `main/urls.py`.

## Documentation layout

- **Per-app:** `{app}/docs/` + `{app}/AI_CONTEXT.md`
- **Shared:** `shared_docs/` — registries, standards, architecture
- **Plans:** `HOS_API/docs/` — feature plans (distill into app docs on implement)

## Key cross-app flows

See [patient_journey.md](patient_journey.md).
