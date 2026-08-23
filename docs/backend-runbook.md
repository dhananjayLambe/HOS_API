# Backend runbook — development, UAT, and production

Copy-paste guide for running the Django backend in [Hospital-Management-API](../Hospital-Management-API). Replace `/path/to/HOS_API` with your clone path.

Working directory is always `Hospital-Management-API/`. Do not commit filled `.env.development`, `.env.uat`, or `.env.production` files.

This runbook is the **virtualenv** path (`runserver` / local Celery). To run the same environments as Docker Compose (API, Celery, Redis, Nginx, and local Postgres), use [docker-compose-runbook.md](docker-compose-runbook.md).

| Git branch | Settings module | Env file | Requirements |
| --- | --- | --- | --- |
| `hos-development` | `main.settings.development` | `.env.development` | `requirements/development.txt` |
| `hos-uat` | `main.settings.uat` | `.env.uat` | `requirements/uat.txt` |
| `main` | `main.settings.production` | `.env.production` | `requirements/production.txt` |

Tests use `main.settings.test` and must not point at UAT or production databases.

## Prerequisites (once)

- Python 3.11
- PostgreSQL
- Redis
- WeasyPrint system libraries (Pango and Cairo)

```bash
cd /path/to/HOS_API/Hospital-Management-API
python3.11 -m venv .venv
source .venv/bin/activate
```

Generate a secret key once per environment and paste it into that environment’s env file (never commit it):

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

The previous key that lived in source is compromised. Use a new key in every environment.

## Development

`manage.py` defaults to `main.settings.development`.

```bash
cd /path/to/HOS_API/Hospital-Management-API
source .venv/bin/activate
pip install -r requirements/development.txt
cp .env.development.example .env.development
# edit .env.development: SECRET_KEY, DB_NAME, DB_USER, DB_PASSWORD, Redis
python manage.py check
python manage.py migrate
python manage.py runserver
```

Optional workers:

```bash
DJANGO_SETTINGS_MODULE=main.settings.development celery -A main worker -l info
DJANGO_SETTINGS_MODULE=main.settings.development celery -A main beat -l info
```

API: `http://127.0.0.1:8000/` — Swagger: `/swagger/`

`pip install -r requirements.txt` is the same as installing `requirements/development.txt`.

## UAT

Fill `.env.uat` with the UAT database, Redis, `ALLOWED_HOSTS`, and frontend origins. `DEBUG` must stay `false`.

```bash
cd /path/to/HOS_API/Hospital-Management-API
source .venv/bin/activate
pip install -r requirements/uat.txt
cp .env.uat.example .env.uat
# edit .env.uat: SECRET_KEY, DB_*, REDIS_*, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS
export DJANGO_SETTINGS_MODULE=main.settings.uat
python manage.py check
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Celery:

```bash
DJANGO_SETTINGS_MODULE=main.settings.uat celery -A main worker -l info
DJANGO_SETTINGS_MODULE=main.settings.uat celery -A main beat -l info
```

On a UAT server, the process manager (systemd/Gunicorn, added later) must set `DJANGO_SETTINGS_MODULE=main.settings.uat` and load `.env.uat`. Set `SECURE_SSL_REDIRECT=true` when the UAT host is served over HTTPS.

## Production

Fill `.env.production` on the production host only. Do not use `runserver` in production.

```bash
cd /path/to/HOS_API/Hospital-Management-API
source .venv/bin/activate
pip install -r requirements/production.txt
cp .env.production.example .env.production
# edit .env.production on the server: SECRET_KEY, DB_*, REDIS_*, ALLOWED_HOSTS, CORS, CSRF, S3
export DJANGO_SETTINGS_MODULE=main.settings.production
python manage.py check --deploy
python manage.py migrate
```

Production settings refuse to start if `DEBUG` is true, `SECRET_KEY` is missing, or `ALLOWED_HOSTS` is empty. Serving with Gunicorn/ASGI is a later deployment phase; that process must set `DJANGO_SETTINGS_MODULE=main.settings.production` and load `.env.production`.

## Tests

```bash
cd /path/to/HOS_API/Hospital-Management-API
source .venv/bin/activate
pip install -r requirements/test.txt
python manage.py test
# or:
python -m pytest
```

`manage.py test` and pytest use `main.settings.test`.

## Baseline checks recorded

Run from `Hospital-Management-API/` with Python 3.11.15 and Django 5.0.7 on 2026-08-18:

```bash
python manage.py check
# System check identified no issues (0 silenced).

DJANGO_SETTINGS_MODULE=main.settings.uat python manage.py check
# System check identified no issues (0 silenced).

DJANGO_SETTINGS_MODULE=main.settings.production python manage.py check --deploy
# System check identified no issues (0 silenced).
```

## Troubleshooting

- **ImproperlyConfigured: SECRET_KEY must be set** — copy the matching `.env.*.example` file, generate a key, and save it in the gitignored env file.
- **ImproperlyConfigured: DEBUG must be False** — UAT and production reject `DEBUG=true`.
- **ImproperlyConfigured: ALLOWED_HOSTS must be set** — set a comma-separated host list in `.env.uat` or `.env.production`.
- **Wrong settings module** — `echo $DJANGO_SETTINGS_MODULE`. Development is the default for `manage.py`; UAT and production must be exported.
- **Postgres connection errors** — confirm `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and that PostgreSQL is running. `manage.py check` does not require a live database; `migrate` and `runserver` do.
- **Redis down** — cache errors are ignored in development; Channels and Celery still need Redis when those processes run.
- **WeasyPrint / Pango** — install OS packages for WeasyPrint if PDF rendering fails at import or request time.
