#!/usr/bin/env bash
set -euo pipefail

SERVICE=""
ENVIRONMENT=""
RUNTIME=""
ARTIFACT=""
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

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[rollback-dry-run] service=${SERVICE} environment=${ENVIRONMENT} runtime=${RUNTIME} artifact=${ARTIFACT}"
  exit 0
fi

if [[ "$RUNTIME" == "ec2" || "$RUNTIME" == "ecr" || "$RUNTIME" == "ecs" ]]; then
  scripts/deploy/exec-runtime.sh --service "$SERVICE" --environment "$ENVIRONMENT" --mode "$RUNTIME" --artifact "$ARTIFACT" --rollback
else
  echo "unsupported runtime for rollback: ${RUNTIME}" >&2
  exit 1
fi

echo "[rollback] done service=${SERVICE} environment=${ENVIRONMENT} runtime=${RUNTIME}"
