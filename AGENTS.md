# AGENTS.md

## Cursor Cloud specific instructions

### Architecture
This is a Hospital Management / EMR system called "DoctorPro EMR" (frontend branded "MedixPro") with two main services:
- **Backend**: Django 5.0.7 + DRF at `/workspace/Hospital-Management-API/` (port 8000)
- **Frontend**: Next.js 15.5.3 + React 19 at `/workspace/Hospital-Web-UI/medixpro/medixpro/` (port 3000)

### Required infrastructure
- **PostgreSQL 16** on port 5432 (database: `demo4_db`, user: `postgres`, password: `123`)
- **Redis** on port 6379 (used for OTP caching, Django cache, Celery broker)

### Starting services
```bash
# Start PostgreSQL and Redis (no systemd)
sudo pg_ctlcluster 16 main start
sudo redis-server --daemonize yes

# Backend
cd /workspace/Hospital-Management-API
python3 manage.py runserver 0.0.0.0:8000

# Frontend
cd /workspace/Hospital-Web-UI/medixpro/medixpro
pnpm dev --port 3000
```

### Non-obvious gotchas
- `requirements.txt` is **incomplete** — it's missing `channels`, `channels-redis`, `django-redis`, `celery`, `django-celery-results`, `django-ratelimit`, `drf-yasg`, `reportlab`, `weasyprint`, and `django-filter`. All must be pip-installed separately.
- `psycopg2` from requirements.txt fails to build; use `psycopg2-binary` instead.
- The auth system is **OTP-based** (not username/password). OTPs are stored in Redis cache with key pattern `staff_otp:{role}:{phone}`. In dev, the OTP is returned in the API response JSON.
- The `ALLOWED_HOSTS` in `settings.py` is empty (`[]`), but Django DEBUG=True allows localhost connections.
- Django model for doctors is imported as `from doctor.models import doctor` (lowercase class name).
- The `diagnostic/tests/` directory is missing `__init__.py`, causing `python3 manage.py test` (all apps) to fail. Run tests for specific apps instead.
- ESLint is not pre-configured; you need to create `.eslintrc.json` and install `eslint@^8` + `eslint-config-next@15.5.3` (ESLint 9 is incompatible with `next lint` in Next.js 15.5.3).
- Swagger API docs are available at `http://localhost:8000/swagger/`.

### Lint
- **Frontend**: `pnpm lint` in `/workspace/Hospital-Web-UI/medixpro/medixpro/` (has pre-existing warnings/errors)
- **Backend**: `python3 manage.py check` in `/workspace/Hospital-Management-API/`

### Tests
- **Backend**: `python3 manage.py test <app_name>` (avoid running all tests due to missing `__init__.py` in `diagnostic/tests/`)
- **Frontend**: `pnpm build` to verify TypeScript/build correctness (no test framework configured)
