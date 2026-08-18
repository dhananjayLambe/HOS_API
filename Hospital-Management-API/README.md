---
owner: platform-team
module: Hospital-Management-API
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# DoctorProCare Backend (Hospital-Management-API)

Django + DRF backend for DoctorPro EMR: consultations, diagnostics, labs, appointments, notifications.

## Stack

- Python 3.11, Django 5.0.7, DRF, SimpleJWT
- PostgreSQL, Redis, Celery, Channels
- drf-yasg (`/swagger/`, `/redoc/`)
- Optional S3 for reports

Supported versions and install files: Python 3.11 (see `.python-version`), runtime packages in `requirements/base.txt`, environment overlays in `requirements/development.txt`, `requirements/uat.txt`, and `requirements/production.txt`.

## Quick start

Follow the copy-paste guide: [Backend runbook](../docs/backend-runbook.md).

```bash
cd Hospital-Management-API
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements/development.txt
cp .env.development.example .env.development
# set SECRET_KEY and DB_* in .env.development
python manage.py check
python manage.py migrate
python manage.py runserver
```

## Documentation architecture

| Location | Purpose |
|---|---|
| [`shared_docs/`](shared_docs/) | Glossary, status registry, ownership, configuration, invariants |
| [`{app}/docs/`](account/docs/) | Per-app living documentation |
| [`{app}/AI_CONTEXT.md`](diagnostics_engine/AI_CONTEXT.md) | AI/Cursor entry point per app |
| [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) | Full documentation guide |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | PR documentation contract |
| [`AGENTS.md`](AGENTS.md) | Cursor/agent orientation |
| [`HOS_API/docs/`](../docs/) | Feature plans and integration checklists |

## Django apps

| Tier | Apps |
|---|---|
| 1 | [diagnostics_engine](diagnostics_engine/docs/), [consultations_core](consultations_core/docs/), [labs](labs/docs/), [doctor](doctor/docs/) |
| 2 | appointments, notifications, patient_account, clinic, queue_management, medicines |
| 3+ | account, helpdesk, hospitalAdmin, hospital_mgmt, reports, support, tasks, etc. |

## API entry points

See [`main/urls.py`](main/urls.py). Swagger: `/swagger/`.

## Contributing

Read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) before opening a PR. Code and documentation change together.
