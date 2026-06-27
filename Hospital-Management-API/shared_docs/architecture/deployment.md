---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Deployment

## Stack

- Django + Gunicorn/ASGI (Channels)
- PostgreSQL
- Redis (Celery broker, Channels, cache)
- Celery workers + beat
- Optional S3 for reports

## Environment

Copy `.env` from team template. See [CONFIGURATION.md](../CONFIGURATION.md).

## Local dev

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# Celery: celery -A main worker -l info
```

## Swagger

- `/swagger/` — Swagger UI
- `/redoc/` — ReDoc
