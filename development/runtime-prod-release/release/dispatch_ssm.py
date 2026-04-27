from __future__ import annotations

import argparse
import base64
import hashlib
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from release.read_edge_api_docs_revision import read_edge_api_docs_revision
from release.runtime_state import (
    load_runtime_image_map,
    normalize_image_reference_to_digest,
    write_runtime_image_map,
)


EDGE_WORKLOAD_ID = "edge-api-gateway"
EDGE_API_DOCS_READ_COMMAND = (
    "docker exec edge-api-gateway "
    "sh -lc 'cat /opt/edge/public-api-docs/revision.json'"
)


def build_release_id(workload_id: str) -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    return f"runtime-prod-release-{workload_id}-{timestamp}"


def _build_runtime_release_manifest_payload(plan_item: dict[str, Any]) -> dict[str, Any]:
    return {
        "wave": 1,
        "waveLabel": plan_item["workload_id"],
        "services": [
            {
                "service": plan_item["workload_id"],
                "action": "deploy",
                "imageUri": plan_item["image_digest"],
            }
        ],
    }


def build_runtime_release_manifest(
    plan_item: dict[str, Any],
    manifest_id: str | None = None,
) -> dict[str, Any]:
    return {
        "releaseId": manifest_id or build_release_id(plan_item["workload_id"]),
        **_build_runtime_release_manifest_payload(plan_item),
    }


def build_applied_config_revision(plan_item: dict[str, Any]) -> str:
    stable_projection = {
        "workload_id": plan_item["workload_id"],
        "target_host_group": plan_item["target_host_group"],
        "deploy_method": plan_item.get("deploy_method"),
        **_build_runtime_release_manifest_payload(plan_item),
    }
    return hashlib.sha256(
        json.dumps(stable_projection, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def render_rollout_commands(
    plan_item: dict[str, Any],
    manifest_id: str | None = None,
) -> list[str]:
    manifest_json = json.dumps(
        build_runtime_release_manifest(plan_item, manifest_id=manifest_id),
        separators=(",", ":"),
    )

    commands = [
        "set -euo pipefail",
        "trap 'rm -f /opt/ev-dashboard/release-manifest.json' EXIT",
        "cat > /opt/ev-dashboard/release-manifest.json <<'JSON'",
        manifest_json,
        "JSON",
        "cd /opt/ev-dashboard/bootstrap",
        "PYTHONPATH=/opt/ev-dashboard/bootstrap python3 -m ev_dashboard_runtime.cli assert-app-release-ready",
        "sudo systemctl start ev-dashboard-app-reconcile.service",
    ]

    return commands


def build_send_command_request(
    plan_item: dict[str, Any],
    manifest_id: str | None = None,
    instance_ids: list[str] | None = None,
) -> dict[str, Any]:
    image_digest = str(plan_item["image_digest"])
    digest_tail = image_digest.split("@sha256:")[-1][:12] if "@sha256:" in image_digest else image_digest[:12]
    request = {
        "DocumentName": "AWS-RunShellScript",
        "Comment": f"rollout {plan_item['workload_id']} {digest_tail}",
        "Parameters": {
            "commands": render_rollout_commands(plan_item, manifest_id=manifest_id),
        },
    }
    if instance_ids:
        request["InstanceIds"] = instance_ids
    else:
        request["Targets"] = [
            {
                "Key": "tag:CleverHostGroup",
                "Values": [plan_item["target_host_group"]],
            }
        ]
    return request


def render_ssm_command_preview(plan_item: dict[str, Any]) -> dict[str, Any]:
    request = build_send_command_request(plan_item)
    return {
        "document_name": request["DocumentName"],
        "target": {
            "mode": "tag",
            "key": "CleverHostGroup",
            "value": plan_item["target_host_group"],
        },
        "comment": request["Comment"],
        "parameters": request["Parameters"],
    }


def resolve_online_instance_ids_for_host_group(host_group: str) -> list[str]:
    ec2_payload = _run_aws_cli(
        "aws",
        "ec2",
        "describe-instances",
        "--filters",
        f"Name=tag:CleverHostGroup,Values={host_group}",
        "Name=instance-state-name,Values=running",
    )
    candidate_ids = sorted(
        {
            str(instance["InstanceId"])
            for reservation in ec2_payload.get("Reservations", [])
            for instance in reservation.get("Instances", [])
            if instance.get("InstanceId")
        }
    )
    if not candidate_ids:
        raise ValueError(f"no running ec2 instances found for host group: {host_group}")

    ssm_payload = _run_aws_cli(
        "aws",
        "ssm",
        "describe-instance-information",
    )
    online_ids = {
        str(item["InstanceId"])
        for item in ssm_payload.get("InstanceInformationList", [])
        if item.get("InstanceId") and item.get("PingStatus") == "Online"
    }
    matched_ids = [instance_id for instance_id in candidate_ids if instance_id in online_ids]
    if not matched_ids:
        raise ValueError(
            f"no online ssm managed instances found for host group: {host_group}"
        )
    return matched_ids


def load_resolved_release_plan(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    resolved_plan = payload["resolved_release_plan"]
    rollout_order = payload.get("rollout_order")
    if not isinstance(rollout_order, list):
        return resolved_plan

    items_by_workload = {
        str(item["workload_id"]): item for item in resolved_plan
    }
    ordered_items = [
        items_by_workload[workload_id]
        for workload_id in rollout_order
        if workload_id in items_by_workload
    ]
    remaining_items = [
        item
        for item in resolved_plan
        if item["workload_id"] not in set(rollout_order)
    ]
    return ordered_items + remaining_items


def write_back_runtime_image_map(plan_items: list[dict[str, Any]]) -> dict[str, str]:
    image_map = load_runtime_image_map()
    merged = dict(image_map)
    for item in plan_items:
        merged[item["workload_id"]] = item["image_digest"]
    write_runtime_image_map(merged)
    return merged


def _run_aws_cli(*args: str) -> dict[str, Any]:
    completed = subprocess.run(
        list(args),
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def _find_plan_item(plan_items: list[dict[str, Any]], workload_id: str) -> dict[str, Any] | None:
    for item in plan_items:
        if item.get("workload_id") == workload_id:
            return item
    return None


def _wait_for_command_invocations(
    command_id: str,
    *,
    poll_interval_seconds: float,
    max_attempts: int,
) -> list[dict[str, Any]]:
    for attempt in range(max_attempts):
        invocation_payload = _run_aws_cli(
            "aws",
            "ssm",
            "list-command-invocations",
            "--command-id",
            command_id,
            "--details",
        )
        invocations = invocation_payload.get("CommandInvocations", [])
        if not invocations:
            if attempt == max_attempts - 1:
                break
            time.sleep(poll_interval_seconds)
            continue

        statuses = {str(invocation.get("Status")) for invocation in invocations}
        if statuses & {"Pending", "InProgress", "Delayed"}:
            if attempt == max_attempts - 1:
                break
            time.sleep(poll_interval_seconds)
            continue

        failed = [status for status in statuses if status != "Success"]
        if failed:
            raise ValueError(
                "ssm command failed with status: " + ", ".join(sorted(set(failed)))
            )
        return invocations

    raise ValueError("timed out waiting for ssm command completion")


def build_edge_api_docs_read_request(plan_item: dict[str, Any]) -> dict[str, Any]:
    return {
        "DocumentName": "AWS-RunShellScript",
        "Comment": f"read-edge-api-docs {plan_item['target_host_group']}",
        "Targets": [
            {
                "Key": "tag:CleverHostGroup",
                "Values": [plan_item["target_host_group"]],
            }
        ],
        "Parameters": {
            "commands": [
                "set -euo pipefail",
                EDGE_API_DOCS_READ_COMMAND,
            ],
        },
    }


def _extract_standard_output(invocation_payload: dict[str, Any]) -> str:
    if "StandardOutputContent" in invocation_payload:
        return str(invocation_payload["StandardOutputContent"])

    plugins = invocation_payload.get("CommandPlugins")
    if isinstance(plugins, list) and plugins:
        plugin = plugins[0]
        if isinstance(plugin, dict):
            for key in ("Output", "StandardOutputContent"):
                if key in plugin:
                    return str(plugin[key])

    raise ValueError("missing standard output from edge api docs readback command")


def _build_post_release_runtime_state_script(plan_item: dict[str, Any]) -> str:
    encoded_plan = base64.b64encode(
        json.dumps(
            {
                "workload_id": plan_item["workload_id"],
                "repo": plan_item["repo"],
            },
            separators=(",", ":"),
        ).encode("utf-8")
    ).decode("ascii")

    return "\n".join(
        [
            "import base64",
            "import json",
            "import subprocess",
            "",
            f"plan_item = json.loads(base64.b64decode('{encoded_plan}'))",
            "container_records = []",
            "for cid in subprocess.check_output(['docker', 'ps', '-q'], text=True).split():",
            "    inspect = json.loads(subprocess.check_output(['docker', 'inspect', cid], text=True))[0]",
            "    image_id = inspect['Image']",
            "    repo_digests = json.loads(",
            "        subprocess.check_output(",
            "            ['docker', 'image', 'inspect', image_id, '--format', '{{json .RepoDigests}}'],",
            "            text=True,",
            "        ).strip() or '[]'",
            "    )",
            "    container_records.append(",
            "        {",
            "            'container_name': inspect.get('Name', '').lstrip('/'),",
            "            'config_image': inspect.get('Config', {}).get('Image', ''),",
            "            'repo_digests': repo_digests,",
            "        }",
            "    )",
            "",
            "repo = plan_item['repo']",
            "match = next(",
            "    (",
            "        record",
            "        for record in container_records",
            "        if any(digest.split('@')[0].endswith('/' + repo) for digest in record['repo_digests'])",
            "        or record['config_image'].endswith('/' + repo)",
            "        or f'/{repo}:' in record['config_image']",
            "    ),",
            "    None,",
            ")",
            "if match is None:",
            "    print(json.dumps({",
            "        'workload_id': plan_item['workload_id'],",
            "        'repo': repo,",
            "        'actual_image_digest': '',",
            "        'container_name': '',",
            "        'config_image': '',",
            "        'smoke_result': 'failed',",
            "        'smoke_detail': 'running container not found',",
            "    }))",
            "    raise SystemExit(0)",
            "",
            "actual_digest = next(",
            "    (",
            "        digest",
            "        for digest in match['repo_digests']",
            "        if digest.split('@')[0].endswith('/' + repo)",
            "    ),",
            "    match['repo_digests'][0] if match['repo_digests'] else match['config_image'],",
            ")",
            "print(json.dumps({",
            "    'workload_id': plan_item['workload_id'],",
            "    'repo': repo,",
            "    'actual_image_digest': actual_digest,",
            "    'container_name': match['container_name'],",
            "    'config_image': match['config_image'],",
            "    'smoke_result': 'passed',",
            "    'smoke_detail': 'running image digest readback succeeded',",
            "}))",
        ]
    )


def build_post_release_runtime_state_request(plan_item: dict[str, Any]) -> dict[str, Any]:
    host_group = plan_item["target_host_group"]
    return {
        "DocumentName": "AWS-RunShellScript",
        "Comment": f"post-release-state {plan_item['workload_id']}",
        "Targets": [
            {
                "Key": "tag:CleverHostGroup",
                "Values": [host_group],
            }
        ],
        "Parameters": {
            "commands": [
                "set -euo pipefail",
                "python3 - <<'PY'",
                _build_post_release_runtime_state_script(plan_item),
                "PY",
            ],
        },
    }


def read_post_release_runtime_state_from_runtime(
    resolved_plan_path: Path,
    poll_interval_seconds: float = 1.0,
    max_attempts: int = 30,
) -> list[dict[str, Any]]:
    plan_items = load_resolved_release_plan(resolved_plan_path)
    image_map = load_runtime_image_map()
    actual_state_by_workload: dict[str, dict[str, Any]] = {}
    for item in plan_items:
        instance_ids = resolve_online_instance_ids_for_host_group(item["target_host_group"])
        request = build_post_release_runtime_state_request(item)
        request.pop("Targets", None)
        request["InstanceIds"] = instance_ids
        response = _run_aws_cli(
            "aws",
            "ssm",
            "send-command",
            "--cli-input-json",
            json.dumps(request),
        )
        command_id = response["Command"]["CommandId"]
        invocations = _wait_for_command_invocations(
            command_id,
            poll_interval_seconds=poll_interval_seconds,
            max_attempts=max_attempts,
        )
        actual_item = json.loads(_extract_standard_output(invocations[0]))
        actual_state_by_workload[str(actual_item["workload_id"])] = actual_item

    results: list[dict[str, Any]] = []
    for item in plan_items:
        runtime_image_reference = image_map.get(item["workload_id"], "")
        actual_state = actual_state_by_workload.get(item["workload_id"], {})
        actual_image_digest = str(actual_state.get("actual_image_digest", ""))
        smoke_result = str(actual_state.get("smoke_result", "failed"))
        smoke_detail = str(actual_state.get("smoke_detail", "missing post-release runtime state"))
        if actual_image_digest != item["image_digest"]:
            smoke_result = "failed"
            smoke_detail = (
                f"actual running image mismatch: expected {item['image_digest']}, got {actual_image_digest or 'missing'}"
            )

        results.append(
            {
                "workload_id": item["workload_id"],
                "target_host_group": item["target_host_group"],
                "resolved_image_digest": item["image_digest"],
                "runtime_image_digest": normalize_image_reference_to_digest(runtime_image_reference),
                "actual_image_digest": actual_image_digest,
                "smoke_result": smoke_result,
                "smoke_detail": smoke_detail,
                "container_name": str(actual_state.get("container_name", "")),
                "config_image": str(actual_state.get("config_image", "")),
            }
        )

    return results


def read_edge_api_docs_revision_from_runtime(
    resolved_plan_path: Path,
    poll_interval_seconds: float = 1.0,
    max_attempts: int = 30,
) -> dict[str, str] | None:
    plan_items = load_resolved_release_plan(resolved_plan_path)
    edge_item = _find_plan_item(plan_items, EDGE_WORKLOAD_ID)
    if edge_item is None:
        return None

    instance_ids = resolve_online_instance_ids_for_host_group(edge_item["target_host_group"])
    request = build_edge_api_docs_read_request(edge_item)
    request.pop("Targets", None)
    request["InstanceIds"] = instance_ids
    response = _run_aws_cli(
        "aws",
        "ssm",
        "send-command",
        "--cli-input-json",
        json.dumps(request),
    )
    command_id = response["Command"]["CommandId"]
    invocations = _wait_for_command_invocations(
        command_id,
        poll_interval_seconds=poll_interval_seconds,
        max_attempts=max_attempts,
    )
    return read_edge_api_docs_revision(_extract_standard_output(invocations[0]))


def dispatch_release_plan(
    plan_items: list[dict[str, Any]],
    poll_interval_seconds: float = 1.0,
    max_attempts: int = 300,
) -> list[dict[str, Any]]:
    responses: list[dict[str, Any]] = []
    for item in plan_items:
        manifest_id = build_release_id(item["workload_id"])
        instance_ids = resolve_online_instance_ids_for_host_group(item["target_host_group"])
        request = build_send_command_request(
            item,
            manifest_id=manifest_id,
            instance_ids=instance_ids,
        )
        response = _run_aws_cli(
            "aws",
            "ssm",
            "send-command",
            "--cli-input-json",
            json.dumps(request),
        )
        command_id = response["Command"]["CommandId"]
        _wait_for_command_invocations(
            command_id,
            poll_interval_seconds=poll_interval_seconds,
            max_attempts=max_attempts,
        )
        responses.append(
            {
                "workload_id": item["workload_id"],
                "target_host_group": item["target_host_group"],
                "image_digest": item["image_digest"],
                "manifest_id": manifest_id,
                "applied_config_revision": build_applied_config_revision(item),
                "ssm_command_id": command_id,
            }
        )
    write_back_runtime_image_map(plan_items)
    return responses


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("resolved_plan_path", type=Path)
    parser.add_argument(
        "--mode",
        choices=("preview", "dispatch", "edge-readback", "post-release-state"),
        default="preview",
    )
    args = parser.parse_args()

    plan_items = load_resolved_release_plan(args.resolved_plan_path)
    if args.mode == "dispatch":
        print(json.dumps(dispatch_release_plan(plan_items), indent=2))
        return
    if args.mode == "edge-readback":
        print(json.dumps(read_edge_api_docs_revision_from_runtime(args.resolved_plan_path), indent=2))
        return
    if args.mode == "post-release-state":
        print(
            json.dumps(
                read_post_release_runtime_state_from_runtime(args.resolved_plan_path),
                indent=2,
            )
        )
        return

    print(
        json.dumps(
            [render_ssm_command_preview(item) for item in plan_items],
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
