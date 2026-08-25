#!/usr/bin/env bash
# Pull the UAT-validated image and start the production Docker Compose stack.
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
require_cmd aws
require_file "${BACKEND_ROOT}/compose.yaml"
require_file "${BACKEND_ROOT}/compose.production.yaml"

assert_branch "$BACKEND_ROOT" "main"

BRANCH="$(current_branch "$BACKEND_ROOT")"
SHA="$(current_sha "$BACKEND_ROOT")"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
ECR_REGISTRY="${ECR_REGISTRY:?Set ECR_REGISTRY, e.g. 123456789012.dkr.ecr.ap-south-1.amazonaws.com}"
ECR_REPOSITORY="hos-api"
export HOS_IMAGE="${ECR_REGISTRY}/${ECR_REPOSITORY}"
export HOS_IMAGE_TAG="${HOS_IMAGE_TAG:?Set HOS_IMAGE_TAG to the UAT-validated image SHA}"
export NGINX_SERVER_NAME="${NGINX_SERVER_NAME:?Set NGINX_SERVER_NAME to the production API hostname}"
RDS_INSTANCE_ID="${RDS_INSTANCE_ID:?Set RDS_INSTANCE_ID to the production RDS instance identifier}"
PROD_ENV_FILE="${PROD_ENV_FILE:-/etc/hos/production.env}"

COMPOSE=(
  docker compose
  --env-file "$PROD_ENV_FILE"
  -f compose.yaml
  -f compose.production.yaml
)

echo "Retrieving production parameters from /hos/production/backend"
write_env_from_ssm "/hos/production/backend" "$PROD_ENV_FILE"

echo "Logging in to ECR and pulling ${HOS_IMAGE}:${HOS_IMAGE_TAG}"
ecr_login "$ECR_REGISTRY"
docker pull "${HOS_IMAGE}:${HOS_IMAGE_TAG}"

echo "Starting Redis"
"${COMPOSE[@]}" up -d --no-build redis
wait_for_healthy redis "${COMPOSE[@]}"

echo "Creating RDS snapshot before production migrations"
SNAPSHOT_ID="hos-pre-migrate-$(date -u +%Y%m%d%H%M%S)-${HOS_IMAGE_TAG:0:8}"
aws rds create-db-snapshot \
  --region "$AWS_REGION" \
  --db-instance-identifier "$RDS_INSTANCE_ID" \
  --db-snapshot-identifier "$SNAPSHOT_ID"
echo "Waiting for snapshot ${SNAPSHOT_ID}"
aws rds wait db-snapshot-available \
  --region "$AWS_REGION" \
  --db-snapshot-identifier "$SNAPSHOT_ID"

echo "Validating production settings and applying migrations once"
"${COMPOSE[@]}" run --rm --no-deps --no-build api python manage.py check --deploy
"${COMPOSE[@]}" run --rm --no-deps --no-build api python manage.py migrate --plan
"${COMPOSE[@]}" run --rm --no-deps --no-build api python manage.py migrate
"${COMPOSE[@]}" run --rm --no-deps --no-build api python manage.py collectstatic --noinput

echo "Starting API, Celery, and Nginx"
"${COMPOSE[@]}" up -d --no-build api celery-worker celery-beat
wait_for_healthy api "${COMPOSE[@]}"
wait_for_healthy celery-worker "${COMPOSE[@]}"
wait_for_healthy celery-beat "${COMPOSE[@]}"
"${COMPOSE[@]}" up -d --no-build --force-recreate --no-deps nginx
wait_for_healthy nginx "${COMPOSE[@]}"

echo "Checking http://127.0.0.1/health/"
wait_for_http_ok "http://127.0.0.1/health/"

record_release "production" "${HOS_IMAGE}:${HOS_IMAGE_TAG}" "$SHA" "$BRANCH"
echo "Production Git commit on main: ${SHA}"
echo "Deployed image tag (must match UAT): ${HOS_IMAGE_TAG}"
echo "RDS snapshot: ${SNAPSHOT_ID}"
echo "Rollback: redeploy the previous known-good HOS_IMAGE_TAG; restore the RDS snapshot only after approval."
echo "CloudWatch: confirm logs in the group set as CLOUDWATCH_LOG_GROUP in ${PROD_ENV_FILE}."
