#!/usr/bin/env bash
# Shared helpers for HOS API Docker Compose deploy scripts.

set -euo pipefail

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 1
  fi
}

require_docker_daemon() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  local host="${DOCKER_HOST:-}"
  if [[ -z "$host" ]]; then
    host="$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
  fi
  echo "Docker CLI is installed, but the Docker daemon is not running." >&2
  if [[ "$host" == *colima* ]] || command -v colima >/dev/null 2>&1; then
    echo "This machine is using Colima. Start it, then rerun the deploy script:" >&2
    echo "  colima start" >&2
  fi
  echo "If you use Docker Desktop, start the app, then:" >&2
  echo "  docker context use desktop-linux" >&2
  if [[ -n "$host" ]]; then
    echo "Current Docker endpoint: ${host}" >&2
  fi
  exit 1
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Required file not found: $path" >&2
    exit 1
  fi
}

current_branch() {
  git -C "$1" rev-parse --abbrev-ref HEAD
}

current_sha() {
  git -C "$1" rev-parse HEAD
}

assert_branch() {
  local repo_root="$1"
  local expected="$2"
  local actual
  actual="$(current_branch "$repo_root")"
  if [[ "${SKIP_BRANCH_CHECK:-}" == "1" ]]; then
    echo "Skipping branch check (SKIP_BRANCH_CHECK=1). Current branch: $actual"
    return 0
  fi
  if [[ "$actual" != "$expected" ]]; then
    echo "Expected Git branch '${expected}', found '${actual}'." >&2
    echo "Checkout the correct branch or set SKIP_BRANCH_CHECK=1." >&2
    exit 1
  fi
}

wait_for_healthy() {
  local service="$1"
  shift
  local compose=("$@")
  local attempts=60
  local i status
  for ((i = 1; i <= attempts; i++)); do
    status="$(
      "${compose[@]}" ps --format json "$service" 2>/dev/null | python3 -c '
import json, sys
raw = sys.stdin.read().strip()
if not raw:
    raise SystemExit(0)
line = raw.splitlines()[0]
payload = json.loads(line)
print(payload.get("Health") or payload.get("State") or "")
' || true
    )"
    if [[ "$status" == "healthy" ]]; then
      echo "Service ${service} is healthy."
      return 0
    fi
    echo "Waiting for ${service} health (${i}/${attempts}): ${status:-unknown}"
    sleep 5
  done
  echo "Service ${service} did not become healthy." >&2
  "${compose[@]}" ps
  "${compose[@]}" logs --tail=80 "$service" >&2 || true
  exit 1
}

wait_for_http_ok() {
  local url="$1"
  local attempts="${2:-30}"
  python3 - "$url" "$attempts" <<'PY'
import sys
import time
import urllib.error
import urllib.request

url = sys.argv[1]
attempts = int(sys.argv[2])
for attempt in range(1, attempts + 1):
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            body = response.read().decode("utf-8", errors="replace")
            if response.status == 200 and '"status"' in body:
                print(f"{url} -> {response.status} {body.strip()}")
                raise SystemExit(0)
            print(f"Waiting for {url} ({attempt}/{attempts}): HTTP {response.status}")
    except urllib.error.HTTPError as exc:
        print(f"Waiting for {url} ({attempt}/{attempts}): HTTP {exc.code}")
    except Exception as exc:
        print(f"Waiting for {url} ({attempt}/{attempts}): {exc}")
    time.sleep(2)
raise SystemExit(f"{url} did not return HTTP 200")
PY
}

write_env_from_ssm() {
  local param_path="$1"
  local dest="$2"
  local region="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
  require_cmd aws
  require_cmd python3
  mkdir -p "$(dirname "$dest")"
  python3 - "$param_path" "$dest" "$region" <<'PY'
import json
import subprocess
import sys

path, dest, region = sys.argv[1], sys.argv[2], sys.argv[3]
params = []
next_token = None
while True:
    cmd = [
        "aws",
        "ssm",
        "get-parameters-by-path",
        "--path",
        path,
        "--recursive",
        "--with-decryption",
        "--region",
        region,
        "--output",
        "json",
    ]
    if next_token:
        cmd.extend(["--next-token", next_token])
    data = json.loads(subprocess.check_output(cmd))
    params.extend(data.get("Parameters") or [])
    next_token = data.get("NextToken")
    if not next_token:
        break
if not params:
    raise SystemExit(f"No SSM parameters returned for {path}.")
with open(dest, "w", encoding="utf-8") as handle:
    for item in params:
        name = item["Name"].rstrip("/").split("/")[-1]
        if not name:
            continue
        handle.write(f"{name}={item.get('Value', '')}\n")
print(f"Wrote environment file {dest} from {path}")
PY
  chmod 600 "$dest"
}

ecr_login() {
  local registry="$1"
  local region="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
  require_cmd aws
  aws ecr get-login-password --region "$region" \
    | docker login --username AWS --password-stdin "$registry"
}

record_release() {
  local env_name="$1"
  local image="$2"
  local sha="$3"
  local branch="$4"
  echo
  echo "=== Deployed ${env_name} ==="
  echo "Git branch: ${branch}"
  echo "Git commit: ${sha}"
  echo "Image:      ${image}"
  echo "Time (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
