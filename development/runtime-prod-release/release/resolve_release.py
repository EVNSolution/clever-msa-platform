from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from release.dispatch_ssm import render_ssm_command_preview
from release.runtime_state import (
    RuntimeStateError,
    resolve_current_runtime_image_digest,
    resolve_latest_successful_main_image_digest,
)


RELEASE_INTENT_FIELDS = {
    "workload_id",
    "repo",
    "release_reason",
}
OPTIONAL_RELEASE_INTENT_FIELDS = {
    "image_digest",
}

WORKLOAD_CLASS_DEPLOY_METHOD = {
    "entry": "compose",
    "core-api": "compose",
    "worker": "systemd",
    "consumer": "systemd",
}


class ReleaseResolutionError(ValueError):
    """Raised when release intent or inventory cannot be resolved."""


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_inventory(inventory_path: Path) -> dict[str, Any]:
    return _load_json(inventory_path)


def load_workload_metadata(metadata_path: Path) -> dict[str, Any]:
    return _load_json(metadata_path)


def metadata_path_for_repo(platform_development_root: Path, repo: str) -> Path:
    return platform_development_root / repo / "release" / "workload-metadata.json"


def fetch_workload_metadata_from_github(repo: str, ref: str = "main") -> dict[str, Any]:
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise ReleaseResolutionError(
            f"missing local metadata for {repo} and GITHUB_TOKEN is not available"
        )

    request = Request(
        f"https://api.github.com/repos/EVNSolution/{repo}/contents/release/workload-metadata.json?ref={ref}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urlopen(request) as response:
            payload = json.load(response)
    except HTTPError as exc:
        raise ReleaseResolutionError(
            f"unable to fetch workload metadata for {repo}: {exc.code}"
        ) from exc

    return json.loads(base64.b64decode(payload["content"]).decode("utf-8"))


def default_workload_metadata(repo: str) -> dict[str, Any]:
    return {
        "workload_id": repo,
        "workload_class": "core-api",
        "entry_impact": False,
        "public_api_contract_impact": False,
        "read_model_impact": False,
        "async_event_impact": False,
        "runtime_config_gate": False,
        "depends_on_workloads": [],
        "expands_to_workloads": [],
    }


def load_workload_metadata_for_repo(
    platform_development_root: Path,
    repo: str,
) -> dict[str, Any]:
    metadata_path = metadata_path_for_repo(platform_development_root, repo)
    if metadata_path.exists():
        return load_workload_metadata(metadata_path)
    try:
        return fetch_workload_metadata_from_github(repo)
    except ReleaseResolutionError as exc:
        if str(exc).endswith(": 404"):
            return default_workload_metadata(repo)
        raise


def resolve_inventory_item(workload_id: str, inventory_path: Path) -> dict[str, Any]:
    inventory = load_inventory(inventory_path)
    items = inventory.get("workloads", {})
    item = items.get(workload_id)
    if item is None:
        raise ReleaseResolutionError(f"unknown workload_id: {workload_id}")

    workload_class = item["workload_class"]
    deploy_method = WORKLOAD_CLASS_DEPLOY_METHOD.get(workload_class)
    if deploy_method is None:
        raise ReleaseResolutionError(f"unsupported workload_class: {workload_class}")

    return {
        "workload_id": workload_id,
        "workload_class": workload_class,
        "target_host_group": item["target_host_group"],
        "deploy_method": deploy_method,
        "healthcheck": item["healthcheck"],
    }


def validate_release_intent_item(item: dict[str, Any]) -> dict[str, Any]:
    unexpected = sorted(set(item) - RELEASE_INTENT_FIELDS - OPTIONAL_RELEASE_INTENT_FIELDS)
    if unexpected:
        raise ReleaseResolutionError(
            "unexpected release intent fields: " + ", ".join(unexpected)
        )

    missing = sorted(RELEASE_INTENT_FIELDS - set(item))
    if missing:
        raise ReleaseResolutionError("missing release intent fields: " + ", ".join(missing))

    return item


def resolve_intent_image_digest(intent_item: dict[str, Any]) -> str:
    explicit_digest = intent_item.get("image_digest")
    if explicit_digest:
        return str(explicit_digest)

    try:
        return resolve_latest_successful_main_image_digest(intent_item["repo"])
    except (RuntimeStateError, ReleaseResolutionError):
        return resolve_current_runtime_image_digest(intent_item["workload_id"])


def resolve_release_item(
    intent_item: dict[str, Any],
    inventory_path: Path,
    rollback_target: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validated = validate_release_intent_item(intent_item)
    inventory_item = resolve_inventory_item(validated["workload_id"], inventory_path)
    return {
        "workload_id": validated["workload_id"],
        "repo": validated["repo"],
        "image_digest": resolve_intent_image_digest(validated),
        "target_host_group": inventory_item["target_host_group"],
        "deploy_method": inventory_item["deploy_method"],
        "healthcheck": inventory_item["healthcheck"],
        "rollback_target": rollback_target
        or {
            "strategy": "last_successful_release_item",
            "workload_id": validated["workload_id"],
        },
    }


def expand_release_set(
    intent_items: list[dict[str, Any]],
    platform_development_root: Path,
) -> list[dict[str, Any]]:
    queued = {
        item["workload_id"]: validate_release_intent_item(item).copy() for item in intent_items
    }
    entry_bundle = {
        "front-web-console",
        "edge-api-gateway",
        "service-account-access",
    }

    changed = True
    while changed:
        changed = False
        for item in list(queued.values()):
            metadata = load_workload_metadata_for_repo(
                platform_development_root,
                item["repo"],
            )

            expansions: set[str] = set()
            if metadata.get("entry_impact"):
                expansions |= entry_bundle
            if metadata.get("public_api_contract_impact"):
                expansions.add("edge-api-gateway")
            if metadata.get("read_model_impact") or metadata.get("async_event_impact"):
                expansions |= set(metadata.get("expands_to_workloads", []))

            for workload_id in expansions:
                if workload_id in queued:
                    continue
                repo = workload_id
                queued[workload_id] = {
                    "workload_id": workload_id,
                    "repo": repo,
                    "release_reason": f"expanded-from:{item['workload_id']}",
                }
                changed = True

    return sorted(queued.values(), key=lambda item: item["workload_id"])


def rollout_sort_key(item: dict[str, Any]) -> tuple[int, str]:
    order = {
        "worker": 0,
        "consumer": 1,
        "core-api": 2,
        "entry": 3,
    }
    workload_class = item.get("workload_class", "entry")
    return (order.get(workload_class, 99), item["workload_id"])


def build_resolve_only_output(
    intent_items: list[dict[str, Any]],
    inventory_path: Path,
    platform_development_root: Path,
) -> dict[str, Any]:
    expanded = expand_release_set(intent_items, platform_development_root)
    resolved_items = []
    for item in expanded:
        resolved = resolve_release_item(item, inventory_path)
        inventory_item = resolve_inventory_item(item["workload_id"], inventory_path)
        resolved["workload_class"] = inventory_item["workload_class"]
        resolved_items.append(resolved)

    rollout_order = [item["workload_id"] for item in sorted(resolved_items, key=rollout_sort_key)]
    previews = [render_ssm_command_preview(item) for item in resolved_items]

    return {
        "resolved_release_plan": resolved_items,
        "rollout_order": rollout_order,
        "ssm_command_preview": previews,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("release_intent_path", type=Path)
    parser.add_argument("--inventory-path", type=Path)
    parser.add_argument("--platform-development-root", type=Path)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    platform_root = args.platform_development_root or repo_root.parent
    inventory_path = args.inventory_path or (
        platform_root / "runtime-prod-platform" / "release" / "prod-runtime-inventory.json"
    )
    intent_items = _load_json(args.release_intent_path)
    output = build_resolve_only_output(intent_items, inventory_path, platform_root)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
