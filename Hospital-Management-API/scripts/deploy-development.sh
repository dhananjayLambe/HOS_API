#!/usr/bin/env bash
# Build and start the local development Docker Compose stack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/compose.sh
source "${SCRIPT_DIR}/lib/compose.sh"

BACKEND_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$BACKEND_ROOT"

require_cmd docker
require_docker_daemon
require_cmd git
require_cmd python3
require_file "${BACKEND_ROOT}/.env.development"
require_file "${BACKEND_ROOT}/compose.yaml"
require_file "${BACKEND_ROOT}/compose.development.yaml"

assert_branch "$BACKEND_ROOT" "hos-development"

BRANCH="$(current_branch "$BACKEND_ROOT")"
SHA="$(current_sha "$BACKEND_ROOT")"
export HOS_IMAGE="${HOS_IMAGE:-hos-api}"
export HOS_IMAGE_TAG="${HOS_IMAGE_TAG:-$SHA}"

COMPOSE=(
  docker compose
  --env-file .env.development
  -f compose.yaml
  -f compose.development.yaml
)

echo "Building ${HOS_IMAGE}:${HOS_IMAGE_TAG} from ${BRANCH} @ ${SHA}"
"${COMPOSE[@]}" build

echo "Starting Redis (Django uses host PostgreSQL at host.docker.internal:5432)"
"${COMPOSE[@]}" up -d redis
wait_for_healthy redis "${COMPOSE[@]}"

echo "Running Django checks and migrations"
"${COMPOSE[@]}" run --rm --no-deps api python manage.py check
"${COMPOSE[@]}" run --rm --no-deps api python manage.py migrate --plan
"${COMPOSE[@]}" run --rm --no-deps api python manage.py migrate
"${COMPOSE[@]}" run --rm --no-deps api python manage.py collectstatic --noinput

echo "Starting API, Celery, and Nginx"
"${COMPOSE[@]}" up -d api celery-worker celery-beat
wait_for_healthy api "${COMPOSE[@]}"
wait_for_healthy celery-worker "${COMPOSE[@]}"
wait_for_healthy celery-beat "${COMPOSE[@]}"
"${COMPOSE[@]}" up -d --force-recreate --no-deps nginx
wait_for_healthy nginx "${COMPOSE[@]}"

echo "Checking http://127.0.0.1:8000/health/"
wait_for_http_ok "http://127.0.0.1:8000/health/"

record_release "development" "${HOS_IMAGE}:${HOS_IMAGE_TAG}" "$SHA" "$BRANCH"
echo "API:     http://localhost:8000/"
echo "Admin:   http://localhost:8000/admin/"
echo "Health:  http://localhost:8000/health/"
echo "Swagger: http://localhost:8000/swagger/"
echo "Alias:   http://127.0.0.1:8080/"
echo "CloudWatch is not used for local development."

if [[ "${DETACH:-}" == "1" ]]; then
  echo "DETACH=1: not following logs. Re-attach with:"
  echo "  ${COMPOSE[*]} logs -f --tail=200 api celery-worker celery-beat nginx"
  exit 0
fi

echo
echo "Following API, Celery, and Nginx logs. Ctrl+C stops this view; containers keep running."
trap '
  echo
  echo "Log view stopped. The stack is still running."
  echo "API:     http://localhost:8000/"
  echo "Admin:   http://localhost:8000/admin/"
  echo "Re-attach logs:"
  echo "  '"${COMPOSE[*]}"' logs -f --tail=200 api celery-worker celery-beat nginx"
  echo "Stop the stack:"
  echo "  '"${COMPOSE[*]}"' down"
  exit 0
' INT
"${COMPOSE[@]}" logs -f --tail=200 api celery-worker celery-beat nginx
