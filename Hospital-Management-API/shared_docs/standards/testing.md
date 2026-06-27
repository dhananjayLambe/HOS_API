---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Testing Strategy (Backend)

Complements test run reports in `HOS_API/docs/backend/test/`.

## Test layers

| Layer | Location | Purpose |
|---|---|---|
| Unit | `{app}/tests/` | Service logic, validators, state machines |
| Integration | `{app}/tests/`, `tests/` | Cross-model flows, API with DB |
| E2E | `tests/e2e/` | Multi-app flows (helpdesk → prescription) |
| Smoke | `tests/smoke/` | JWT auth, critical path health |

## Conventions

- Use `pytest` (`pytest.ini`, `conftest.py` at project root)
- Factories in `tests/factories/`
- Mock external APIs (WhatsApp Meta, S3) in unit tests; use simulated provider flags in integration

## Per-app TESTING.md

Create `{app}/docs/TESTING.md` only when the app has non-standard patterns (e.g., routing debug flags, catalog import commands).

## CI

- `.github/workflows/doctor-dashboard-tests.yml` — doctor dashboard suite
- Future: docs-check.yml for documentation freshness
