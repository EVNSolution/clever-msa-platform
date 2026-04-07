#!/usr/bin/env bash
set -euo pipefail

SERVICE=""
ENVIRONMENT=""
MODE=""
ARTIFACT=""
SHA="${GITHUB_SHA:-}"
COMPOSE_SERVICE=""
COMPOSE_FILE=""
REMOTE_REPO_DIR=""
INSTANCE_SELECTOR=""
REMOTE_HEALTH_COMMAND=""
DRY_RUN="${DRY_RUN:-false}"
ROLLBACK="${ROLLBACK:-false}"
TIMEOUT_SECONDS="${DEPLOY_CMD_TIMEOUT_SECONDS:-600}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service)
      SERVICE="$2"; shift 2 ;;
    --environment|--env)
      ENVIRONMENT="$2"; shift 2 ;;
    --mode)
      MODE="$2"; shift 2 ;;
    --artifact)
      ARTIFACT="$2"; shift 2 ;;
    --sha)
      SHA="$2"; shift 2 ;;
    --compose-service)
      COMPOSE_SERVICE="$2"; shift 2 ;;
    --compose-file)
      COMPOSE_FILE="$2"; shift 2 ;;
    --remote-repo-dir)
      REMOTE_REPO_DIR="$2"; shift 2 ;;
    --instance-selector)
      INSTANCE_SELECTOR="$2"; shift 2 ;;
    --remote-health-command)
      REMOTE_HEALTH_COMMAND="$2"; shift 2 ;;
    --dry-run)
      DRY_RUN="$2"; shift 2 ;;
    --rollback)
      ROLLBACK="true"; shift 1 ;;
    --timeout)
      TIMEOUT_SECONDS="$2"; shift 2 ;;
    *)
      echo "unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$SERVICE" || -z "$ENVIRONMENT" || -z "$MODE" || -z "$ARTIFACT" ]]; then
  echo "service/environment/mode/artifact are required" >&2
  exit 1
fi

artifact_name="${ARTIFACT#ecr:}"
artifact_name="${artifact_name#s3:}"

safe_service="${SERVICE//-/_}"
safe_service="$(printf '%s' "$safe_service" | tr '[:lower:]' '[:upper:]')"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] mode=${MODE} service=${SERVICE} environment=${ENVIRONMENT} artifact=${ARTIFACT} sha=${SHA:-none}"
fi

render_value() {
  local value="$1"
  value="${value//\{environment\}/$ENVIRONMENT}"
  value="${value//\{service\}/$SERVICE}"
  value="${value//\{compose_service\}/$COMPOSE_SERVICE}"
  value="${value//\{compose_file\}/$COMPOSE_FILE}"
  value="${value//\{remote_repo_dir\}/$REMOTE_REPO_DIR}"
  value="${value//\{sha\}/$SHA}"
  printf '%s' "$value"
}

build_instance_filters() {
  local selector="$1"
  selector="$(render_value "$selector")"
  if [[ -z "$selector" ]]; then
    return 0
  fi

  IFS=',' read -r -a raw_filters <<< "$selector"
  for raw in "${raw_filters[@]}"; do
    raw="${raw#"${raw%%[![:space:]]*}"}"
    raw="${raw%"${raw##*[![:space:]]}"}"
    [[ -z "$raw" ]] && continue
    if [[ "$raw" != *=* ]]; then
      continue
    fi
    local name="${raw%%=*}"
    local value="${raw#*=}"
    printf 'Name=%s,Values=%s\n' "$name" "$value"
  done
}

resolve_instance_ids() {
  local selector="$1"
  local filters=()
  while IFS= read -r filter; do
    [[ -n "$filter" ]] && filters+=("$filter")
  done < <(build_instance_filters "$selector")

  if [[ "${#filters[@]}" -eq 0 ]]; then
    echo ""
    return 0
  fi

  aws ec2 describe-instances \
    --filters "${filters[@]}" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text 2>/dev/null || true
}

if [[ "$MODE" == "ec2" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo " [noop] would discover instances by selector: $(render_value "$INSTANCE_SELECTOR")"
    exit 0
  fi

  if [[ -z "$COMPOSE_SERVICE" || -z "$COMPOSE_FILE" || -z "$REMOTE_REPO_DIR" || -z "$INSTANCE_SELECTOR" ]]; then
    echo "ec2 deploy requires compose_service/compose_file/remote_repo_dir/instance_selector" >&2
    exit 1
  fi

  read -r -a instance_ids <<< "$(resolve_instance_ids "$INSTANCE_SELECTOR")"
  if [[ "${#instance_ids[@]}" -eq 0 || -z "${instance_ids[0]:-}" ]]; then
    echo "no running EC2 instance matched selector: $(render_value "$INSTANCE_SELECTOR")" >&2
    exit 1
  fi

  if [[ "$ROLLBACK" == "true" ]]; then
    mapfile -t remote_commands < <(printf '%s\n' \
      "set -euo pipefail" \
      "cd $(render_value "$REMOTE_REPO_DIR")" \
      "test -f .deploy-state/$(render_value "$COMPOSE_SERVICE").previous_sha" \
      "previous_sha=\$(cat .deploy-state/$(render_value "$COMPOSE_SERVICE").previous_sha)" \
      "git fetch --all --tags" \
      "git checkout --detach \"\$previous_sha\"" \
      "docker compose -f $(render_value "$COMPOSE_FILE") up -d --build $(render_value "$COMPOSE_SERVICE")" \
      "docker compose -f $(render_value "$COMPOSE_FILE") ps $(render_value "$COMPOSE_SERVICE")")
  else
    mapfile -t remote_commands < <(printf '%s\n' \
      "set -euo pipefail" \
      "cd $(render_value "$REMOTE_REPO_DIR")" \
      "mkdir -p .deploy-state" \
      "git rev-parse HEAD > .deploy-state/$(render_value "$COMPOSE_SERVICE").previous_sha || true" \
      "git fetch --all --tags" \
      "git checkout --detach $(render_value "$SHA")" \
      "docker compose -f $(render_value "$COMPOSE_FILE") up -d --build $(render_value "$COMPOSE_SERVICE")" \
      "docker compose -f $(render_value "$COMPOSE_FILE") ps $(render_value "$COMPOSE_SERVICE")")
    if [[ -n "$REMOTE_HEALTH_COMMAND" ]]; then
      remote_commands+=("$(render_value "$REMOTE_HEALTH_COMMAND")")
    fi
  fi

  commands_json="$(python3 - "${remote_commands[@]}" <<'PY'
import json, sys
print(json.dumps({"commands": sys.argv[1:]}))
PY
)"

  aws ssm send-command \
    --instance-ids "${instance_ids[@]}" \
    --document-name "AWS-RunShellScript" \
    --parameters "$commands_json" \
    --timeout-seconds "${TIMEOUT_SECONDS}" \
    --comment "clever msa deploy ${SERVICE} ${ENVIRONMENT}" >/tmp/exec-runtime-ssm-${SERVICE}.json

  echo "SSM command sent for ${SERVICE} (${MODE})"
  cat "/tmp/exec-runtime-ssm-${SERVICE}.json"
elif [[ "$MODE" == "ecr" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo " [noop] would verify image in ECR repo=${artifact_name}"
    exit 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "aws CLI not found" >&2
    exit 1
  fi

  if [[ "$ROLLBACK" == "true" ]]; then
    echo "ECR rollback for ${SERVICE} must be handled by ECS/service-specific command"
    exit 0
  fi

  aws ecr describe-images \
    --repository-name "${artifact_name}" \
    --image-ids imageTag="${SHA}" >/dev/null
  echo "ECR artifact verified: ${artifact_name}:${SHA}"
  echo "ECR runtime deploy for ${SERVICE} is intentionally explicit and requires service adapter implementation."
else
  echo "unsupported runtime mode: ${MODE}" >&2
  exit 1
fi

echo "runtime execute done: service=${SERVICE}, environment=${ENVIRONMENT}, mode=${MODE}, rollback=${ROLLBACK}"
