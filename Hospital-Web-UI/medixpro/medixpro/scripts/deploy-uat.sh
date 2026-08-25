#!/usr/bin/env bash
# Build the UAT frontend image, publish it to ECR, and deploy it on the UAT EC2 host.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/deploy.sh"
FRONTEND_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPOSITORY_ROOT="$(cd "${FRONTEND_ROOT}/../../.." && pwd)"
cd "$FRONTEND_ROOT"

require_cmd aws
require_cmd docker
require_cmd git
require_cmd python3
require_docker_daemon
assert_branch "$REPOSITORY_ROOT" hos-uat

SHA="$(current_sha "$REPOSITORY_ROOT")"
ECR_REGISTRY="${ECR_REGISTRY:?Set ECR_REGISTRY}"
# Always hos-web. Do not read ECR_REPOSITORY from the shell; SSM pastes like
# `export ECR_REPOSITORY=hos-web` + `clear` become hos-webclear and ECR 403s.
ECR_REPOSITORY="hos-web"
export HOS_WEB_IMAGE="${ECR_REGISTRY}/${ECR_REPOSITORY}"
export HOS_WEB_IMAGE_TAG="${HOS_WEB_IMAGE_TAG:-${SHA}-uat}"
export NGINX_CONF="${NGINX_CONF:-uat.conf}"
UAT_ENV_FILE="${UAT_ENV_FILE:-/etc/hos-web/uat.env}"
COMPOSE=(docker compose --env-file "$UAT_ENV_FILE" -f compose.yaml -f compose.uat.yaml)

write_env_from_ssm /hos/uat/frontend "$UAT_ENV_FILE"
ecr_login "$ECR_REGISTRY"
"${COMPOSE[@]}" build web
echo "Pushing ${HOS_WEB_IMAGE}:${HOS_WEB_IMAGE_TAG}"
docker push "${HOS_WEB_IMAGE}:${HOS_WEB_IMAGE_TAG}"

"${COMPOSE[@]}" up -d --no-build web
wait_for_healthy web "${COMPOSE[@]}"
"${COMPOSE[@]}" up -d --no-build --force-recreate --no-deps nginx
wait_for_healthy nginx "${COMPOSE[@]}"
wait_for_http_ok http://127.0.0.1/health/

echo "UAT source commit: ${SHA}"
echo "UAT image: ${HOS_WEB_IMAGE}:${HOS_WEB_IMAGE_TAG}"
echo "Promote this source commit after UAT approval."

