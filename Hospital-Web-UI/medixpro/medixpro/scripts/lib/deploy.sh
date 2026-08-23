#!/usr/bin/env bash
# Shared helpers for the HOS web deployment scripts.

set -euo pipefail

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

require_file() {
  [[ -f "$1" ]] || {
    echo "Required file not found: $1" >&2
    exit 1
  }
}

require_docker_daemon() {
  docker info >/dev/null 2>&1 || {
    echo "Docker is installed but its daemon is not running." >&2
    exit 1
  }
}

current_branch() {
  git -C "$1" rev-parse --abbrev-ref HEAD
}

current_sha() {
  git -C "$1" rev-parse HEAD
}

assert_branch() {
  local repository="$1" expected="$2" actual
  actual="$(current_branch "$repository")"
  if [[ "${SKIP_BRANCH_CHECK:-}" == "1" ]]; then
    echo "Skipping branch check; current branch: ${actual}"
    return
  fi
  [[ "$actual" == "$expected" ]] || {
    echo "Expected Git branch '${expected}', found '${actual}'." >&2
    exit 1
  }
}

wait_for_healthy() {
  local service="$1"
  shift
  local compose=("$@") status
  for ((attempt = 1; attempt <= 60; attempt++)); do
    status="$("${compose[@]}" ps --format json "$service" 2>/dev/null | python3 -c '
import json, sys
line = next((line for line in sys.stdin.read().splitlines() if line.strip()), "")
if line:
    print((json.loads(line).get("Health") or json.loads(line).get("State") or ""))
' || true)"
    if [[ "$status" == "healthy" ]]; then
      echo "Service ${service} is healthy."
      return
    fi
    echo "Waiting for ${service} (${attempt}/60): ${status:-unknown}"
    sleep 5
  done
  "${compose[@]}" ps
  "${compose[@]}" logs --tail=100 "$service" >&2 || true
  echo "Service ${service} did not become healthy." >&2
  exit 1
}

wait_for_http_ok() {
  local url="$1"
  python3 - "$url" <<'PY'
import sys
import time
import urllib.request

for attempt in range(1, 31):
    try:
        with urllib.request.urlopen(sys.argv[1], timeout=5) as response:
            if response.status == 200:
                print(f"{sys.argv[1]} -> 200")
                raise SystemExit(0)
    except Exception as error:
        print(f"Waiting for {sys.argv[1]} ({attempt}/30): {error}")
    time.sleep(2)
raise SystemExit(f"{sys.argv[1]} did not return HTTP 200")
PY
}

write_env_from_ssm() {
  local parameter_path="$1" destination="$2"
  local region="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
  mkdir -p "$(dirname "$destination")"
  python3 - "$parameter_path" "$destination" "$region" <<'PY'
import json
import subprocess
import sys

path, destination, region = sys.argv[1:]
parameters, token = [], None
while True:
    command = ["aws", "ssm", "get-parameters-by-path", "--path", path,
               "--recursive", "--with-decryption", "--region", region, "--output", "json"]
    if token:
        command.extend(["--next-token", token])
    response = json.loads(subprocess.check_output(command))
    parameters.extend(response.get("Parameters", []))
    token = response.get("NextToken")
    if not token:
        break
if not parameters:
    raise SystemExit(f"No SSM parameters returned for {path}.")
with open(destination, "w", encoding="utf-8") as env_file:
    for parameter in parameters:
        key = parameter["Name"].rstrip("/").split("/")[-1]
        if key:
            env_file.write(f"{key}={parameter.get('Value', '')}\n")
print(f"Wrote {destination} from {path}")
PY
  chmod 600 "$destination"
}

ecr_login() {
  local registry="$1" region="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
  aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registry"
}

