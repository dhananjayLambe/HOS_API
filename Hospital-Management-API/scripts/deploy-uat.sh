#!/usr/bin/env bash
# Build, push, and start the UAT Docker Compose stack on the UAT EC2 host.
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
require_file "${BACKEND_ROOT}/compose.uat.yaml"

assert_branch "$BACKEND_ROOT" "hos-uat"

BRANCH="$(current_branch "$BACKEND_ROOT")"
SHA="$(current_sha "$BACKEND_ROOT")"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
ECR_REGISTRY="${ECR_REGISTRY:?Set ECR_REGISTRY, e.g. 123456789012.dkr.ecr.ap-south-1.amazonaws.com}"
ECR_REPOSITORY="${ECR_REPOSITORY:-hos-api}"
export HOS_IMAGE="${HOS_IMAGE:-${ECR_REGISTRY}/${ECR_REPOSITORY}}"
export HOS_IMAGE_TAG="${HOS_IMAGE_TAG:-$SHA}"
export HOS_PULL_POLICY="${HOS_PULL_POLICY:-always}"
export NGINX_SERVER_NAME="${NGINX_SERVER_NAME:?Set NGINX_SERVER_NAME to the UAT API hostname}"
UAT_ENV_FILE="${UAT_ENV_FILE:-/etc/hos/uat.env}"

COMPOSE=(
  docker compose
  --env-file "$UAT_ENV_FILE"
  -f compose.yaml
  -f compose.uat.yaml
)

echo "Retrieving UAT parameters from /hos/uat/"
write_env_from_ssm "/hos/uat" "$UAT_ENV_FILE"

echo "Logging in to ECR and building ${HOS_IMAGE}:${HOS_IMAGE_TAG}"
ecr_login "$ECR_REGISTRY"
docker compose -f compose.yaml build
docker push "${HOS_IMAGE}:${HOS_IMAGE_TAG}"

echo "Starting Redis"
"${COMPOSE[@]}" up -d redis
wait_for_healthy redis "${COMPOSE[@]}"

echo "Validating UAT settings and applying migrations once"
"${COMPOSE[@]}" run --rm --no-deps api python manage.py check --deploy
"${COMPOSE[@]}" run --rm --no-deps api python manage.py migrate --plan
"${COMPOSE[@]}" run --rm --no-deps api python manage.py migrate
"${COMPOSE[@]}" run --rm --no-deps api python manage.py collectstatic --noinput

echo "Starting API, Celery, and Nginx"
"${COMPOSE[@]}" up -d --no-build api celery-worker celery-beat
wait_for_healthy api "${COMPOSE[@]}"
wait_for_healthy celery-worker "${COMPOSE[@]}"
wait_for_healthy celery-beat "${COMPOSE[@]}"
"${COMPOSE[@]}" up -d --no-build --force-recreate --no-deps nginx
wait_for_healthy nginx "${COMPOSE[@]}"

echo "Checking http://127.0.0.1/health/"
wait_for_http_ok "http://127.0.0.1/health/"

record_release "uat" "${HOS_IMAGE}:${HOS_IMAGE_TAG}" "$SHA" "$BRANCH"
echo "Promote this same image tag to production after UAT approval."
echo "CloudWatch: confirm logs in the group set as CLOUDWATCH_LOG_GROUP in ${UAT_ENV_FILE}."
