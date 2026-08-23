#!/usr/bin/env bash
# Build and run the frontend locally against the local backend Docker stack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/deploy.sh"
FRONTEND_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPOSITORY_ROOT="$(cd "${FRONTEND_ROOT}/../../.." && pwd)"
cd "$FRONTEND_ROOT"

require_cmd docker
require_cmd git
require_cmd python3
require_docker_daemon
require_file .env.development
assert_branch "$REPOSITORY_ROOT" hos-development

SHA="$(current_sha "$REPOSITORY_ROOT")"
export HOS_WEB_IMAGE="${HOS_WEB_IMAGE:-hos-web}"
export HOS_WEB_IMAGE_TAG="${HOS_WEB_IMAGE_TAG:-$SHA}"
COMPOSE=(docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml)

"${COMPOSE[@]}" build web
"${COMPOSE[@]}" up -d --no-build web
wait_for_healthy web "${COMPOSE[@]}"

echo "Frontend is available at http://127.0.0.1:3000/"
echo "It expects the backend stack at http://127.0.0.1:8000/."

