# Docker Compose runbook — development, UAT, and production

Copy-paste guide for running the HOS Django API as containers. Working directory is always `Hospital-Management-API/`. Replace `/path/to/HOS_API` with your clone path.

This is the container runtime. To run the same code in a local virtualenv instead, use [backend-runbook.md](backend-runbook.md). AWS account, RDS, S3, and Parameter Store setup is in [aws-production-deployment-runbook.md](aws-production-deployment-runbook.md). Branch promotion is in [git-workflow.md](git-workflow.md).

Do not commit filled `.env.development`, `.env.uat`, or `.env.production` files. Do not put secrets in the Docker image or in named volumes.

| Environment | Git branch | Compose files | Settings module | Secrets file |
| --- | --- | --- | --- | --- |
| Development | `hos-development` | `compose.yaml` + `compose.development.yaml` | `main.settings.development` | `.env.development` on the developer machine |
| UAT | `hos-uat` | `compose.yaml` + `compose.uat.yaml` | `main.settings.uat` | `/etc/hos/uat.env` generated from `/hos/uat/*` |
| Production | `main` | `compose.yaml` + `compose.production.yaml` | `main.settings.production` | `/etc/hos/production.env` generated from `/hos/production/*` |

The image always installs `requirements/production.txt` (including Gunicorn and Uvicorn). API, Celery worker, and Celery beat use that same image. Tag every UAT/production image with the Git commit SHA. Do not deploy an image tagged only `latest`.

```text
hos-development build → UAT image validation → same image promoted to production
```

## Prerequisites

- Docker Engine and Docker Compose v2. On this Mac that is Colima (`colima start`) or Docker Desktop. The current Docker context must point at a running daemon.
- A filled `.env.development` for local Compose (copy from `.env.development.example`)
- `SECRET_KEY` and `DB_PASSWORD` set in `.env.development` (Compose PostgreSQL refuses an empty password)
- For UAT/production: AWS CLI on the EC2 host, an ECR repository, Parameter Store values, and TLS certificates in the `nginx-certificates` volume

`DB_HOST` and `REDIS_HOST` may stay `localhost` in `.env.development` for virtualenv use. Inside Compose, Redis is `redis`. Development Compose points Django at host PostgreSQL via `host.docker.internal` (the pgAdmin **PostgreSQL 16** `demo5_db` on port 5432). Optional in-Compose Postgres is profile `compose-db` on host port 5433.

## Development

```bash
cd /path/to/HOS_API/Hospital-Management-API
cp .env.development.example .env.development
# edit .env.development: SECRET_KEY, DB_PASSWORD
./scripts/deploy-development.sh
```

The script checks that you are on `hos-development`, builds `hos-api:<git-sha>`, starts Redis and PostgreSQL, runs `check` / `migrate` / `collectstatic` once, then starts API, Celery, and Nginx. After `/health/` returns 200, the same terminal follows API, Celery, and Nginx logs. **Ctrl+C stops the log view only; containers keep running.**

To skip the branch check on a throwaway local branch:

```bash
SKIP_BRANCH_CHECK=1 ./scripts/deploy-development.sh
```

To start the stack without following logs:

```bash
DETACH=1 ./scripts/deploy-development.sh
```

Equivalent manual commands:

```bash
cd /path/to/HOS_API/Hospital-Management-API
export HOS_IMAGE=hos-api
export HOS_IMAGE_TAG=local
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml build
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up -d redis postgres
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml run --rm api python manage.py check
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml run --rm api python manage.py migrate --plan
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml run --rm api python manage.py migrate
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml run --rm api python manage.py collectstatic --noinput
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up -d
```

URLs after Nginx is up (same paths as `runserver`):

| Path | URL |
| --- | --- |
| API | http://localhost:8000/ |
| Admin | http://localhost:8000/admin/ |
| Health | http://localhost:8000/health/ |
| Swagger | http://localhost:8000/swagger/ |
| WebSocket | `ws://localhost:8000/ws/queue-updates/<clinic_id>/<doctor_id>/` |
| Alias | http://127.0.0.1:8080/ |

PostgreSQL is published on `localhost:5432` for local tools. Stop a host PostgreSQL instance first if that port is already taken. Stop `python manage.py runserver` before Compose if port 8000 is already in use.

Re-attach logs after Ctrl+C or `DETACH=1`:

```bash
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml logs -f --tail=200 api celery-worker celery-beat nginx
```

### Useful development commands

```bash
cd /path/to/HOS_API/Hospital-Management-API
COMPOSE="docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml"

$COMPOSE ps
$COMPOSE logs -f api nginx celery-worker celery-beat
$COMPOSE run --rm api python manage.py <command>
$COMPOSE stop
$COMPOSE down
```

Reset the development database volume (destroys local Compose Postgres data):

```bash
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml down
docker volume rm hos-api_postgres-development-data
```

## UAT

Run on the UAT EC2 host from `hos-uat`. The instance role must read `/hos/uat/*` and push/pull the ECR repository.

```bash
cd /path/to/HOS_API/Hospital-Management-API
git checkout hos-uat
git pull origin hos-uat
export AWS_REGION=ap-south-1
export ECR_REGISTRY=123456789012.dkr.ecr.ap-south-1.amazonaws.com
export ECR_REPOSITORY=hos-api
export NGINX_SERVER_NAME=uat.example.com
./scripts/deploy-uat.sh
```

The script writes `/etc/hos/uat.env` from Parameter Store, builds and pushes `ECR_REGISTRY/hos-api:<git-sha>`, starts Redis, runs `check --deploy`, `migrate --plan`, `migrate`, and `collectstatic`, then starts API, Celery, and Nginx. Only ports 80 and 443 are published. Django, Celery, Redis, and RDS are not public.

Place Let’s Encrypt files into the `nginx-certificates` volume before HTTPS will serve:

```text
/etc/nginx/certs/fullchain.pem
/etc/nginx/certs/privkey.pem
```

Record the image tag printed at the end of the script. That SHA is the only tag production may pull.

## Production

Run on the production EC2 host from `main` after UAT approval. Do not rebuild. Pull the UAT-validated SHA.

```bash
cd /path/to/HOS_API/Hospital-Management-API
git checkout main
git pull origin main
export AWS_REGION=ap-south-1
export ECR_REGISTRY=123456789012.dkr.ecr.ap-south-1.amazonaws.com
export ECR_REPOSITORY=hos-api
export NGINX_SERVER_NAME=api.example.com
export RDS_INSTANCE_ID=hos-prod-postgres
export HOS_IMAGE_TAG=<uat-validated-git-sha>
./scripts/deploy-production.sh
```

The script writes `/etc/hos/production.env`, pulls the image, starts Redis, creates an RDS snapshot, then runs checks, migrations, `collectstatic`, and health checks. Only ports 80 and 443 are public.

Rollback an application release by setting `HOS_IMAGE_TAG` to the previous known-good SHA and running the production script again. Do not reverse a migration blindly; restore the RDS snapshot only after assessing data loss and obtaining approval.

## Parameter Store

| Environment | Path | Server file |
| --- | --- | --- |
| UAT | `/hos/uat/*` | `/etc/hos/uat.env` |
| Production | `/hos/production/*` | `/etc/hos/production.env` |

Give each EC2 instance access only to its own path. Include at least:

```text
DJANGO_SETTINGS_MODULE
SECRET_KEY
ALLOWED_HOSTS
CORS_ALLOWED_ORIGINS
CSRF_TRUSTED_ORIGINS
DB_NAME
DB_USER
DB_PASSWORD
DB_HOST
DB_PORT
REDIS_URL
AWS_REPORTS_BUCKET
AWS_REGION
SECURE_SSL_REDIRECT
NGINX_SERVER_NAME
```

`REDIS_HOST` / `REDIS_URL` in the server file can stay as documentation; Compose sets `redis://redis:6379/1` inside the stack.

## Migrations and static files

Do not run `migrate` or `collectstatic` in the container entrypoint. Deployment scripts run them once before API traffic is accepted:

```text
python manage.py check --deploy   # UAT and production
python manage.py migrate --plan
python manage.py migrate
python manage.py collectstatic --noinput
```

## Troubleshooting

- **`failed to connect to the docker API` / Colima socket missing** — the Docker daemon is stopped. Start it, then rerun the script:

```bash
colima start
./scripts/deploy-development.sh
```

If you use Docker Desktop instead of Colima:

```bash
docker context use desktop-linux
./scripts/deploy-development.sh
```

- **`DB_PASSWORD is missing a value: Set DB_PASSWORD in .env.development`** — Compose interpolation does **not** read `.env.development` unless you pass it. Editing `.env.development.example` has no effect. Use:

```bash
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml logs -f --tail=200 api nginx
```

- **`DB_PASSWORD must be set` during Compose parse** — fill `DB_PASSWORD` in `.env.development` (not the `.example` file) and pass `--env-file .env.development`.
- **Code/settings changes not visible in Docker** — the image is a snapshot. Development now bind-mounts the repo into `api` with Gunicorn `--reload`. Recreate: `docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up -d --force-recreate --no-deps api`. For a full image rebuild use `./scripts/deploy-development.sh`.
- **Port 8000 already allocated** — stop `python manage.py runserver` or the other process using 8000. Compose publishes Nginx on 8000 so `/admin/` matches the virtualenv URL.
- **Port 8080 already allocated** — stop the other process or change the extra published port in `compose.development.yaml`.
- **Port 5432 already allocated** — development uses host PostgreSQL 16 on 5432. Optional Compose Postgres uses host port 5433 (`COMPOSE_PROFILES=compose-db`).
- **API cannot reach the database** — inside development Compose, Django uses `host.docker.internal:5432` (the same `demo5_db` as pgAdmin). Redis stays `redis`.
- **Redis / Channels / Celery connection errors** — inside Compose the hostname is `redis`. The override sets `REDIS_URL=redis://redis:6379/1`.
- **Static files 404** — run `collectstatic` before starting Nginx, or restart Nginx after collectstatic.
- **`/health/` is 502 Bad Gateway** — Nginx cached an old API container IP. Recreate Nginx after the API is healthy: `docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up -d --force-recreate --no-deps nginx`. The configs re-resolve `api` through Docker DNS.
- **`/health/` is 400 DisallowedHost** — UAT/production settings append `127.0.0.1` and `localhost` after validating `ALLOWED_HOSTS`. Confirm the settings module is the one you intended.
- **WebSocket 400/502** — Nginx must proxy `/ws/` with `Upgrade` and `Connection`. Confirm Redis is healthy.
- **UAT/production Nginx fails on 443** — copy `fullchain.pem` and `privkey.pem` into the `nginx-certificates` volume. HTTP `/health/` still works without TLS.
- **Django SSL redirect loop** — Nginx must send `X-Forwarded-Proto`. `/health/` is exempt from `SECURE_SSL_REDIRECT`.
- **Wrong settings module** — `docker compose exec api python -c "import os; print(os.environ['DJANGO_SETTINGS_MODULE'])"`
