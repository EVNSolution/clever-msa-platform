from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


EDGE_WORKLOAD_ID = "edge-api-gateway"
EDGE_API_DOCS_REVISION_KEYS = (
    "edge_commit_sha",
    "openapi_sha256",
    "service_export_manifest_sha",
)


def _validate_api_docs_revision(api_docs_revision: Any) -> None:
    if not isinstance(api_docs_revision, dict):
        raise ValueError("api_docs_revision must be an object")

    unexpected = sorted(set(api_docs_revision) - set(EDGE_API_DOCS_REVISION_KEYS))
    missing = sorted(set(EDGE_API_DOCS_REVISION_KEYS) - set(api_docs_revision))
    if unexpected or missing:
        raise ValueError(
            "api_docs_revision must contain exactly "
            + ", ".join(EDGE_API_DOCS_REVISION_KEYS)
        )

    for key in EDGE_API_DOCS_REVISION_KEYS:
        if not isinstance(api_docs_revision[key], str):
            raise ValueError(f"api_docs_revision.{key} must be a string")


def _validate_image_consistency(item: dict[str, Any], allow_legacy: bool) -> None:
    if "runtime_image_digest" not in item or "actual_image_digest" not in item or "image_consistency" not in item:
        if allow_legacy:
            return
        raise ValueError(
            "release evidence requires runtime_image_digest, actual_image_digest, and image_consistency"
        )

    for key in ("runtime_image_digest", "actual_image_digest"):
        if not isinstance(item[key], str):
            raise ValueError(f"{key} must be a string")

    image_consistency = item["image_consistency"]
    if not isinstance(image_consistency, dict):
        raise ValueError("image_consistency must be an object")

    required_keys = {
        "resolved_equals_runtime",
        "runtime_equals_actual",
        "resolved_equals_actual",
        "passed",
    }
    unexpected = sorted(set(image_consistency) - required_keys)
    missing = sorted(required_keys - set(image_consistency))
    if unexpected or missing:
        raise ValueError(
            "image_consistency must contain exactly "
            + ", ".join(sorted(required_keys))
        )

    for key in required_keys:
        if not isinstance(image_consistency[key], bool):
            raise ValueError(f"image_consistency.{key} must be a boolean")


def _validate_evidence_item(item: dict[str, Any], allow_legacy: bool = False) -> None:
    _validate_image_consistency(item, allow_legacy=allow_legacy)
    if item.get("workload_id") != EDGE_WORKLOAD_ID:
        return

    if "api_docs_revision" not in item:
        raise ValueError("edge-api-gateway evidence requires api_docs_revision")

    _validate_api_docs_revision(item["api_docs_revision"])


def load_evidence(evidence_path: Path) -> list[dict[str, Any]]:
    if not evidence_path.exists():
        return []

    items = json.loads(evidence_path.read_text(encoding="utf-8"))
    for item in items:
        _validate_evidence_item(item, allow_legacy=True)
    return items


def write_evidence(evidence_path: Path, items: list[dict[str, Any]]) -> None:
    for item in items:
        _validate_evidence_item(item)

    evidence_path.write_text(json.dumps(items, indent=2), encoding="utf-8")


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_edge_api_docs_revision(path: Path | None) -> dict[str, str] | None:
    if path is None or not path.exists():
        return None

    payload = _load_json(path)
    if payload is None:
        return None

    _validate_api_docs_revision(payload)
    return payload


def _load_post_release_state(path: Path) -> list[dict[str, Any]]:
    payload = _load_json(path)
    if not isinstance(payload, list):
        raise ValueError("post_release_state must be a list")
    return payload


def _build_image_consistency(
    resolved_image_digest: str,
    runtime_image_digest: str,
    actual_image_digest: str,
) -> dict[str, bool]:
    return {
        "resolved_equals_runtime": resolved_image_digest == runtime_image_digest,
        "runtime_equals_actual": runtime_image_digest == actual_image_digest,
        "resolved_equals_actual": resolved_image_digest == actual_image_digest,
        "passed": (
            resolved_image_digest == runtime_image_digest == actual_image_digest
        ),
    }


def build_release_evidence(
    resolved_plan_items: list[dict[str, Any]],
    dispatch_results: list[dict[str, Any]],
    post_release_state: list[dict[str, Any]],
    approver: str,
    edge_api_docs_revision: dict[str, str] | None = None,
    timestamp: str | None = None,
) -> list[dict[str, Any]]:
    dispatch_by_workload = {
        item["workload_id"]: item for item in dispatch_results
    }
    post_release_by_workload = {
        item["workload_id"]: item for item in post_release_state
    }
    resolved_timestamp = timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    evidence_items: list[dict[str, Any]] = []
    for resolved_item in resolved_plan_items:
        workload_id = resolved_item["workload_id"]
        dispatch_item = dispatch_by_workload.get(workload_id)
        if dispatch_item is None:
            raise ValueError(f"missing dispatch result for workload: {workload_id}")
        post_release_item = post_release_by_workload.get(workload_id)
        if post_release_item is None:
            raise ValueError(f"missing post-release runtime state for workload: {workload_id}")

        image_consistency = _build_image_consistency(
            resolved_image_digest=resolved_item["image_digest"],
            runtime_image_digest=post_release_item["runtime_image_digest"],
            actual_image_digest=post_release_item["actual_image_digest"],
        )
        smoke_result = str(post_release_item["smoke_result"])
        if smoke_result != "passed":
            raise ValueError(f"post-release smoke failed for workload: {workload_id}")
        if not image_consistency["passed"]:
            raise ValueError(f"post-release image consistency failed for workload: {workload_id}")

        evidence_item = {
            "workload_id": workload_id,
            "target_host_group": dispatch_item["target_host_group"],
            "image_digest": resolved_item["image_digest"],
            "runtime_image_digest": post_release_item["runtime_image_digest"],
            "actual_image_digest": post_release_item["actual_image_digest"],
            "manifest_id": dispatch_item["manifest_id"],
            "approver": approver,
            "ssm_command_id": dispatch_item["ssm_command_id"],
            "applied_config_revision": dispatch_item["applied_config_revision"],
            "smoke_result": smoke_result,
            "image_consistency": image_consistency,
            "timestamp": resolved_timestamp,
        }
        if workload_id == EDGE_WORKLOAD_ID:
            if edge_api_docs_revision is None:
                raise ValueError("edge-api-gateway evidence requires edge api docs revision")
            evidence_item["api_docs_revision"] = edge_api_docs_revision

        _validate_evidence_item(evidence_item)
        evidence_items.append(evidence_item)

    return evidence_items


def select_last_successful_release_item(
    workload_id: str,
    evidence_items: list[dict[str, Any]],
) -> dict[str, Any]:
    candidates = [
        item
        for item in evidence_items
        if item.get("workload_id") == workload_id
        and item.get("image_digest")
        and item.get("applied_config_revision")
        and item.get("smoke_result") == "passed"
    ]
    if not candidates:
        raise ValueError(f"no successful release evidence for workload: {workload_id}")
    return sorted(candidates, key=lambda item: item["timestamp"])[-1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("resolved_plan_path", type=Path)
    parser.add_argument("dispatch_results_path", type=Path)
    parser.add_argument("post_release_state_path", type=Path)
    parser.add_argument("--approver", required=True)
    parser.add_argument("--edge-api-docs-revision-path", type=Path)
    parser.add_argument("--output-path", type=Path, required=True)
    args = parser.parse_args()

    resolved_payload = _load_json(args.resolved_plan_path)
    if isinstance(resolved_payload, list):
        resolved_plan_items = resolved_payload
    else:
        resolved_plan_items = resolved_payload["resolved_release_plan"]

    dispatch_results = _load_json(args.dispatch_results_path)
    evidence_items = build_release_evidence(
        resolved_plan_items=resolved_plan_items,
        dispatch_results=dispatch_results,
        post_release_state=_load_post_release_state(args.post_release_state_path),
        approver=args.approver,
        edge_api_docs_revision=_load_edge_api_docs_revision(args.edge_api_docs_revision_path),
    )
    write_evidence(args.output_path, evidence_items)


if __name__ == "__main__":
    main()
