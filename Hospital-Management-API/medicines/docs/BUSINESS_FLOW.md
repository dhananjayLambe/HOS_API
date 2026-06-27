---
owner: medicines-team
module: medicines
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — medicines

## Purpose

Medicine master catalog and search/autofill engines for prescription entry in consultations_core.

## Actors

Doctor (search during Rx), admin (import catalog).

## Key capabilities

- Fast medicine search with fuzzy matching
- Autofill from templates
- Import via `import_medicines` management command

## Integration

Consumed by `consultations_core` Prescription and PrescriptionLine models — no separate patient-facing API for Rx catalog browsing in most flows.

Base API: `/api/medicines/`

## Services

13+ service modules under `services/` — see [SERVICES.md](SERVICES.md).
