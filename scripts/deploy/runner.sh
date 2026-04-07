#!/usr/bin/env bash
set -euo pipefail

SERVICE=""
ENVIRONMENT=""
RUNTIME=""
ARTIFACT=""
DEPLOY_COMMAND=""
HEALTH_CHECK=""
COMPOSE_SERVICE=""
COMPOSE_FILE=""
REMOTE_REPO_DIR=""
INSTANCE_SELECTOR=""
REMOTE_HEALTH_COMMAND=""
DRY_RUN="${DRY_RUN:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service)
      SERVICE="$2"; shift 2 ;;
    --environment|--env)
      ENVIRONMENT="$2"; shift 2 ;;
    --runtime)
      RUNTIME="$2"; shift 2 ;;
    --artifact)
      ARTIFACT="$2"; shift 2 ;;
    --deploy-command)
      DEPLOY_COMMAND="$2"; shift 2 ;;
    --health-check)
      HEALTH_CHECK="$2"; shift 2 ;;
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
    *)
      echo "unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$SERVICE" || -z "$ENVIRONMENT" || -z "$RUNTIME" || -z "$ARTIFACT" ]]; then
  echo "service/environment/runtime/artifact are required" >&2
  exit 1
fi

echo "[runner] start"
echo "service=${SERVICE} environment=${ENVIRONMENT} runtime=${RUNTIME} artifact=${ARTIFACT} dry_run=${DRY_RUN}"
echo "deploy_command=${DEPLOY_COMMAND:-<none>}"

if [[ -z "$REMOTE_HEALTH_COMMAND" ]]; then
  REMOTE_HEALTH_COMMAND=":"
fi

if [[ "$DEPLOY_COMMAND" == *"scripts/deploy/runner.sh"* ]]; then
  DEPLOY_COMMAND="scripts/deploy/exec-runtime.sh --service {service} --environment {environment} --mode {runtime} --artifact {artifact} --sha {sha} --compose-service {compose_service} --compose-file {compose_file} --remote-repo-dir {remote_repo_dir} --instance-selector {instance_selector} --remote-health-command {remote_health_command}"
fi

if [[ -z "$DEPLOY_COMMAND" ]]; then
  DEPLOY_COMMAND="scripts/deploy/exec-runtime.sh --service {service} --environment {environment} --mode {runtime} --artifact {artifact} --sha {sha} --compose-service {compose_service} --compose-file {compose_file} --remote-repo-dir {remote_repo_dir} --instance-selector {instance_selector} --remote-health-command {remote_health_command}"
fi

COMMAND="${DEPLOY_COMMAND}"
COMMAND="${COMMAND//"{service}"/$SERVICE}"
COMMAND="${COMMAND//"{environment}"/$ENVIRONMENT}"
COMMAND="${COMMAND//"{runtime}"/$RUNTIME}"
COMMAND="${COMMAND//"{artifact}"/$ARTIFACT}"
COMMAND="${COMMAND//"{sha}"/${GITHUB_SHA:-latest}}"
COMMAND="${COMMAND//"{compose_service}"/$COMPOSE_SERVICE}"
COMMAND="${COMMAND//"{compose_file}"/$COMPOSE_FILE}"
COMMAND="${COMMAND//"{remote_repo_dir}"/$REMOTE_REPO_DIR}"
COMMAND="${COMMAND//"{instance_selector}"/$INSTANCE_SELECTOR}"
COMMAND="${COMMAND//"{remote_health_command}"/$REMOTE_HEALTH_COMMAND}"

if [[ "$DRY_RUN" == "true" ]]; then
  COMMAND="${COMMAND} --dry-run true"
else
  COMMAND="${COMMAND} --dry-run false"
fi

bash -lc "$COMMAND"

if [[ -n "$HEALTH_CHECK" && "${SKIP_HEALTH_CHECK:-false}" != "true" ]]; then
  base=""
  safe_service="${SERVICE//-/_}"
  safe_service="$(printf '%s' "$safe_service" | tr '[:lower:]' '[:upper:]')"
  base_url_candidates="SERVICE_HEALTHCHECK_BASE_URL_${safe_service}"

  if [[ -n "${!base_url_candidates:-}" ]]; then
    base="${!base_url_candidates}"
  elif [[ -n "${SERVICE_HEALTHCHECK_BASE_URL:-}" ]]; then
    base="${SERVICE_HEALTHCHECK_BASE_URL}"
  fi
  if [[ -n "$base" ]]; then
    url="${base%/}$HEALTH_CHECK"
    if command -v curl >/dev/null 2>&1; then
      echo "[runner] health check: $url"
      for i in {1..12}; do
        code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$url" || true)
        if [[ "$code" == "200" ]]; then
          echo "[runner] health check OK"
          break
        fi
        echo "[runner] waiting health check... ($i/12)"
        sleep 5
      done
    else
      echo "[runner] curl not found, skip health check"
    fi
  else
    echo "[runner] health check base URL missing (SERVICE_HEALTHCHECK_BASE_URL), skip"
  fi
fi

echo "[runner] done"
