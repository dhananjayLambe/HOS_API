#!/usr/bin/env bash
# Start or stop the HOS UAT AWS stack from a laptop (admin / operator IAM).
# See docs/other/UAT_AWS_ENV_ENABLE_DISABLE_PLAN.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${UAT_ENV_CONFIG:-${SCRIPT_DIR}/uat-env.env}"

AWS_REGION="${AWS_REGION:-ap-south-1}"
UAT_EC2_NAME_TAGS="${UAT_EC2_NAME_TAGS:-hos-uat-web-01,hos-uat-api-01}"
UAT_RDS_INSTANCE_ID="${UAT_RDS_INSTANCE_ID:-hos-uat-postgres}"
UAT_S3_BUCKET="${UAT_S3_BUCKET:-}"
UAT_API_HEALTH_URL="${UAT_API_HEALTH_URL:-}"

DRY_RUN=0
ASSUME_YES=0
TAKE_SNAPSHOT=0
COMMAND=""

usage() {
  cat <<'EOF'
Usage: uat-env.sh <status|enable|disable> [--dry-run] [--yes] [--snapshot]

  status     Show live UAT URLs (web/API/health), EC2, RDS, Elastic IPs
  enable     Start RDS, wait, start EC2s, wait, optional /health/ check
  disable    Stop EC2s, wait, stop RDS (optional RDS snapshot)

  --dry-run  Print actions; do not stop/start
  --yes      Skip the confirmation prompt
  --snapshot On disable, create an RDS snapshot before stop

Config: copy scripts/aws/uat-env.env.example to scripts/aws/uat-env.env
Region defaults to ap-south-1. Production names are refused.
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

load_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
}

parse_args() {
  [[ $# -ge 1 ]] || { usage; exit 1; }
  COMMAND="$1"
  shift
  case "$COMMAND" in
    status|enable|disable) ;;
    -h|--help|help) usage; exit 0 ;;
    *) usage; die "unknown command: $COMMAND" ;;
  esac
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) DRY_RUN=1 ;;
      --yes) ASSUME_YES=1 ;;
      --snapshot) TAKE_SNAPSHOT=1 ;;
      -h|--help) usage; exit 0 ;;
      *) die "unknown flag: $1" ;;
    esac
    shift
  done
}

assert_uat_name() {
  local value="$1"
  local label="$2"
  [[ "$value" == *prod* || "$value" == *production* ]] && die "$label looks like production: $value"
  [[ "$value" == hos-uat-* ]] || die "$label must start with hos-uat-: $value"
}

run_aws() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] aws' >&2
    printf ' %q' "$@" >&2
    printf '\n' >&2
    return 0
  fi
  aws "$@"
}

confirm() {
  local prompt="$1"
  if [[ "$DRY_RUN" -eq 1 || "$ASSUME_YES" -eq 1 ]]; then
    return 0
  fi
  local reply
  read -r -p "$prompt [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]] || die "aborted"
}

split_csv() {
  local csv="$1"
  local IFS=','
  # shellcheck disable=SC2206
  local parts=($csv)
  local trimmed=()
  local part
  for part in "${parts[@]}"; do
    part="${part#"${part%%[![:space:]]*}"}"
    part="${part%"${part##*[![:space:]]}"}"
    [[ -n "$part" ]] && trimmed+=("$part")
  done
  printf '%s\n' "${trimmed[@]}"
}

print_identity() {
  local account user
  account="$(aws sts get-caller-identity --query Account --output text)"
  user="$(aws sts get-caller-identity --query Arn --output text)"
  echo "AWS account: $account"
  echo "AWS identity: $user"
  echo "AWS region: $AWS_REGION"
}

ec2_ids_json() {
  local names_csv="$1"
  local name_filter
  name_filter="$(split_csv "$names_csv" | paste -sd, -)"
  aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --filters \
      "Name=tag:Name,Values=${name_filter}" \
      "Name=instance-state-name,Values=pending,running,stopping,stopped,shutting-down" \
    --query 'Reservations[].Instances[]' \
    --output json
}

require_uat_ec2_tag() {
  local instance_id="$1"
  local env
  env="$(aws ec2 describe-tags \
    --region "$AWS_REGION" \
    --filters "Name=resource-id,Values=${instance_id}" "Name=key,Values=Environment" \
    --query 'Tags[0].Value' --output text)"
  [[ "$env" == "uat" ]] || die "EC2 ${instance_id} is missing Environment=uat (got: ${env})"
}

require_uat_rds_tag() {
  local rds_id="$1"
  local account arn env
  account="$(aws sts get-caller-identity --query Account --output text)"
  arn="arn:aws:rds:${AWS_REGION}:${account}:db:${rds_id}"
  env="$(aws rds list-tags-for-resource \
    --region "$AWS_REGION" \
    --resource-name "$arn" \
    --query 'TagList[?Key==`Environment`].Value | [0]' --output text)"
  if [[ "$env" != "uat" ]]; then
    die "RDS ${rds_id} is missing Environment=uat (got: ${env}). Tag it once:
  aws rds add-tags-to-resource --region ${AWS_REGION} --resource-name ${arn} --tags Key=Environment,Value=uat Key=Name,Value=${rds_id}"
  fi
}

discover_ec2() {
  local names_csv="$1"
  ec2_ids_json "$names_csv" | python3 -c '
import json, sys
instances = json.load(sys.stdin) or []
if not instances:
    sys.stderr.write("no EC2 instances matched UAT_EC2_NAME_TAGS\n")
    sys.exit(1)
for inst in instances:
    name = next((t["Value"] for t in inst.get("Tags", []) if t["Key"] == "Name"), "")
    public = inst.get("PublicIpAddress") or "-"
    print("\t".join([
        inst["InstanceId"],
        name,
        inst["State"]["Name"],
        inst.get("InstanceType", "-"),
        public,
        inst.get("PrivateIpAddress") or "-",
    ]))
'
}

http_url() {
  local ip="$1"
  if [[ -z "$ip" || "$ip" == "-" || "$ip" == "None" ]]; then
    echo "(no public IP until enable)"
    return
  fi
  echo "http://${ip}/"
}

cmd_status() {
  print_identity
  echo
  local found=0
  local id name state itype public private
  local web_ip="" api_ip="" web_state="" api_state=""
  local uat_on=1
  echo "=== Access URLs (current public IP) ==="
  while IFS=$'\t' read -r id name state itype public private; do
    found=1
    case "$name" in
      hos-uat-web-01)
        web_ip="$public"
        web_state="$state"
        ;;
      hos-uat-api-01)
        api_ip="$public"
        api_state="$state"
        ;;
    esac
    if [[ "$state" != "running" ]]; then
      uat_on=0
    fi
  done < <(discover_ec2 "$UAT_EC2_NAME_TAGS")

  if [[ "$found" -ne 1 ]]; then
    echo "  (no UAT EC2 instances matched ${UAT_EC2_NAME_TAGS})"
    uat_on=0
  fi

  if [[ "$uat_on" -eq 1 && -n "$web_ip" && "$web_ip" != "-" && -n "$api_ip" && "$api_ip" != "-" ]]; then
    echo "  UAT: ON"
  else
    echo "  UAT: OFF (start with: ./scripts/aws/uat-env.sh enable)"
  fi
  echo "  Web app:   $(http_url "$web_ip")"
  echo "  API:       $(http_url "$api_ip")"
  if [[ -n "$api_ip" && "$api_ip" != "-" ]]; then
    echo "  Health:    http://${api_ip}/health/"
  else
    echo "  Health:    (no public IP until enable)"
  fi
  [[ -n "$web_state" ]] && echo "  Web host:  hos-uat-web-01  ${web_state}"
  [[ -n "$api_state" ]] && echo "  API host:  hos-uat-api-01  ${api_state}"

  echo
  echo "=== EC2 ==="
  found=0
  while IFS=$'\t' read -r id name state itype public private; do
    found=1
    printf '  %-20s %s  %s  %s  public=%s  private=%s\n' "$name" "$id" "$state" "$itype" "$public" "$private"
  done < <(discover_ec2 "$UAT_EC2_NAME_TAGS")
  [[ "$found" -eq 1 ]] || echo "  (none matched ${UAT_EC2_NAME_TAGS})"

  echo
  echo "=== RDS ==="
  aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --db-instance-identifier "$UAT_RDS_INSTANCE_ID" \
    --query 'DBInstances[0].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Class:DBInstanceClass,MultiAZ:MultiAZ,Endpoint:Endpoint.Address}' \
    --output table

  echo
  echo "=== Elastic IPs (UAT Name tag or associated to UAT instances) ==="
  aws ec2 describe-addresses \
    --region "$AWS_REGION" \
    --query 'Addresses[].{PublicIp:PublicIp,InstanceId:InstanceId,AllocationId:AllocationId,Name:Tags[?Key==`Name`]|[0].Value}' \
    --output table || true

  echo
  echo "=== NAT gateways (should be empty for UAT) ==="
  local nat_count
  nat_count="$(aws ec2 describe-nat-gateways \
    --region "$AWS_REGION" \
    --filter Name=state,Values=available,pending \
    --query 'length(NatGateways)' --output text)"
  if [[ "$nat_count" != "0" ]]; then
    echo "  WARNING: ${nat_count} NAT gateway(s) exist in this region. NAT is expensive (~\$32+/month)."
    echo "  First-UAT plan uses public subnet + EIP and should not create NAT."
    aws ec2 describe-nat-gateways \
      --region "$AWS_REGION" \
      --filter Name=state,Values=available,pending \
      --query 'NatGateways[].{Id:NatGatewayId,State:State,Name:Tags[?Key==`Name`]|[0].Value}' \
      --output table
  else
    echo "  none (good)"
  fi

  if [[ -n "$UAT_S3_BUCKET" ]]; then
    echo
    echo "=== S3 ${UAT_S3_BUCKET} (storage still bills when UAT is stopped) ==="
    aws s3 ls "s3://${UAT_S3_BUCKET}" --recursive --summarize --human-readable 2>/dev/null \
      | tail -n 2 || echo "  could not list bucket (check name / permissions)"
  fi

  echo
  echo "IPs change after disable/enable if Elastic IPs are released. Re-run status for the current URLs."
  echo "Stopped EC2/RDS still bill EBS, RDS storage, snapshots, Elastic IPs, and S3."
  echo "RDS auto-starts after 7 days if left stopped. Re-run disable or check status."
}

wait_ec2_state() {
  local waiter="$1"
  shift
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] aws ec2 wait ${waiter} --instance-ids $*"
    return 0
  fi
  echo "Waiting for EC2 ${waiter}: $*"
  aws ec2 wait "$waiter" --region "$AWS_REGION" --instance-ids "$@"
}

wait_rds_available() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] aws rds wait db-instance-available --db-instance-identifier ${UAT_RDS_INSTANCE_ID}"
    return 0
  fi
  echo "Waiting for RDS ${UAT_RDS_INSTANCE_ID} to become available..."
  aws rds wait db-instance-available \
    --region "$AWS_REGION" \
    --db-instance-identifier "$UAT_RDS_INSTANCE_ID"
}

collect_instance_ids() {
  local id name state itype public private
  local found=0
  while IFS=$'\t' read -r id name state itype public private; do
    require_uat_ec2_tag "$id"
    found=1
    printf '%s\n' "$id"
  done < <(discover_ec2 "$UAT_EC2_NAME_TAGS")
  [[ "$found" -eq 1 ]] || die "no UAT EC2 instances found"
}

health_check() {
  [[ -n "$UAT_API_HEALTH_URL" ]] || { echo "UAT_API_HEALTH_URL unset; skip health check"; return 0; }
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] curl -fsS ${UAT_API_HEALTH_URL}"
    return 0
  fi
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 10 "$UAT_API_HEALTH_URL" >/dev/null; then
      echo "Health OK: ${UAT_API_HEALTH_URL}"
      return 0
    fi
    echo "Health not ready yet (${i}/10); waiting 20s..."
    sleep 20
  done
  echo "warning: ${UAT_API_HEALTH_URL} did not return 200. SSM into hos-uat-api-01 and check docker compose." >&2
  return 1
}

rds_start_or_continue() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] aws rds start-db-instance --db-instance-identifier ${UAT_RDS_INSTANCE_ID}"
    return 0
  fi
  local out rc
  set +e
  out="$(aws rds start-db-instance \
    --region "$AWS_REGION" \
    --db-instance-identifier "$UAT_RDS_INSTANCE_ID" 2>&1)"
  rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    if echo "$out" | grep -q InvalidDBInstanceState; then
      echo "RDS is not in a startable state (already available/starting). Continuing."
    else
      echo "$out" >&2
      die "failed to start RDS ${UAT_RDS_INSTANCE_ID}"
    fi
  fi
}

rds_stop_or_continue() {
  local snap=""
  if [[ "$TAKE_SNAPSHOT" -eq 1 ]]; then
    snap="hos-uat-postgres-pre-stop-$(date -u +%Y%m%d%H%M)"
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    if [[ -n "$snap" ]]; then
      echo "[dry-run] aws rds stop-db-instance --db-instance-identifier ${UAT_RDS_INSTANCE_ID} --db-snapshot-identifier ${snap}" >&2
    else
      echo "[dry-run] aws rds stop-db-instance --db-instance-identifier ${UAT_RDS_INSTANCE_ID}" >&2
    fi
    return 0
  fi
  local out rc
  set +e
  if [[ -n "$snap" ]]; then
    out="$(aws rds stop-db-instance \
      --region "$AWS_REGION" \
      --db-instance-identifier "$UAT_RDS_INSTANCE_ID" \
      --db-snapshot-identifier "$snap" 2>&1)"
  else
    out="$(aws rds stop-db-instance \
      --region "$AWS_REGION" \
      --db-instance-identifier "$UAT_RDS_INSTANCE_ID" 2>&1)"
  fi
  rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    if echo "$out" | grep -q InvalidDBInstanceState; then
      echo "RDS is not in a stoppable state (already stopped/stopping). Continuing."
    else
      echo "$out" >&2
      die "failed to stop RDS ${UAT_RDS_INSTANCE_ID}"
    fi
  fi
}

cmd_enable() {
  print_identity
  require_uat_rds_tag "$UAT_RDS_INSTANCE_ID"
  local ids=()
  local id
  while IFS= read -r id; do
    ids+=("$id")
  done < <(collect_instance_ids)
  echo "Will start RDS ${UAT_RDS_INSTANCE_ID}, then EC2: ${ids[*]}"
  confirm "Enable UAT now?"

  rds_start_or_continue
  wait_rds_available

  run_aws ec2 start-instances --region "$AWS_REGION" --instance-ids "${ids[@]}" >/dev/null
  wait_ec2_state instance-running "${ids[@]}"

  if [[ "$DRY_RUN" -eq 0 ]]; then
    echo "Waiting for EC2 status checks..."
    aws ec2 wait instance-status-ok --region "$AWS_REGION" --instance-ids "${ids[@]}" || \
      echo "warning: instance-status-ok timed out; continuing to health check"
  else
    echo "[dry-run] aws ec2 wait instance-status-ok --instance-ids ${ids[*]}"
  fi

  health_check || true
  echo "UAT enable complete. Docker Compose should resume via restart: unless-stopped."
}

cmd_disable() {
  print_identity
  require_uat_rds_tag "$UAT_RDS_INSTANCE_ID"
  local ids=()
  local id
  while IFS= read -r id; do
    ids+=("$id")
  done < <(collect_instance_ids)
  echo "Will stop EC2: ${ids[*]}, then RDS ${UAT_RDS_INSTANCE_ID}"
  echo "Elastic IPs stay allocated. S3 is not touched."
  confirm "Disable UAT now?"

  run_aws ec2 stop-instances --region "$AWS_REGION" --instance-ids "${ids[@]}" >/dev/null
  wait_ec2_state instance-stopped "${ids[@]}"
  rds_stop_or_continue

  echo "UAT disable requested. RDS may show stopping for a few minutes."
  echo "Reminder: AWS restarts a stopped RDS instance after 7 days. Re-run disable if UAT stays off."
}

main() {
  load_env_file
  parse_args "$@"
  require_cmd aws
  require_cmd python3
  export AWS_REGION

  local name
  while IFS= read -r name; do
    assert_uat_name "$name" "EC2 Name tag"
  done < <(split_csv "$UAT_EC2_NAME_TAGS")
  assert_uat_name "$UAT_RDS_INSTANCE_ID" "RDS identifier"

  case "$COMMAND" in
    status) cmd_status ;;
    enable) cmd_enable ;;
    disable) cmd_disable ;;
  esac
}

main "$@"
