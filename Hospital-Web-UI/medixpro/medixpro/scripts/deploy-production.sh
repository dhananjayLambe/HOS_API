#!/usr/bin/env bash
# Build the approved source commit with production-only routing, then deploy it.
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
assert_branch "$REPOSITORY_ROOT" main

SHA="$(current_sha "$REPOSITORY_ROOT")"
APPROVED_SHA="${APPROVED_SHA:?Set APPROVED_SHA to the UAT-approved Git commit SHA}"
[[ "$SHA" == "$APPROVED_SHA" ]] || {
  echo "main is ${SHA}, but APPROVED_SHA is ${APPROVED_SHA}. Refusing to deploy unapproved source." >&2
  exit 1
}

ECR_REGISTRY="${ECR_REGISTRY:?Set ECR_REGISTRY}"
ECR_REPOSITORY="hos-web"
export HOS_WEB_IMAGE="${ECR_REGISTRY}/${ECR_REPOSITORY}"
export HOS_WEB_IMAGE_TAG="${HOS_WEB_IMAGE_TAG:-${APPROVED_SHA}-production}"
PROD_ENV_FILE="${PROD_ENV_FILE:-/etc/hos-web/production.env}"
COMPOSE=(docker compose --env-file "$PROD_ENV_FILE" -f compose.yaml -f compose.production.yaml)

write_env_from_ssm /hos/production/frontend "$PROD_ENV_FILE"
ecr_login "$ECR_REGISTRY"
# Next.js embeds BACKEND_PROXY_TARGET while building. This image is from the
# identical approved source, but must use the production API hostname.
"${COMPOSE[@]}" build web
docker push "${HOS_WEB_IMAGE}:${HOS_WEB_IMAGE_TAG}"

"${COMPOSE[@]}" up -d --no-build web
wait_for_healthy web "${COMPOSE[@]}"
"${COMPOSE[@]}" up -d --no-build --force-recreate --no-deps nginx
wait_for_healthy nginx "${COMPOSE[@]}"
wait_for_http_ok http://127.0.0.1/health/

echo "Production source commit: ${SHA}"
echo "Production image: ${HOS_WEB_IMAGE}:${HOS_WEB_IMAGE_TAG}"
echo "Rollback: redeploy the previous known-good production image tag."

