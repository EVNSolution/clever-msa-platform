from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from release.dispatch_ssm import (
    EDGE_API_DOCS_READ_COMMAND,
    EDGE_WORKLOAD_ID,
    build_applied_config_revision,
    build_edge_api_docs_read_request,
    build_post_release_runtime_state_request,
    build_runtime_release_manifest,
    build_send_command_request,
    dispatch_release_plan,
    read_post_release_runtime_state_from_runtime,
    read_edge_api_docs_revision_from_runtime,
    render_ssm_command_preview,
    resolve_online_instance_ids_for_host_group,
)


def test_compose_workload_uses_tag_target_and_runtime_manifest_reconcile() -> None:
    request = build_send_command_request(
        {
            "workload_id": "front-web-console",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:demo",
            "target_host_group": "evdash-msa",
            "deploy_method": "compose",
            "healthcheck": {"kind": "http", "path": "/health", "expect_status": 200},
        }
    )

    assert request["Targets"] == [
        {"Key": "tag:CleverHostGroup", "Values": ["evdash-msa"]}
    ]
    commands = request["Parameters"]["commands"]
    assert any("release-manifest.json" in command for command in commands)
    assert any("assert-app-release-ready" in command for command in commands)
    assert any("systemctl start ev-dashboard-app-reconcile.service" in command for command in commands)
    assert any("front-web-console" in command for command in commands)
    assert any("front-web-console@sha256:demo" in command for command in commands)


def test_dispatch_uses_same_reconcile_service_for_worker_workload_on_shared_host() -> None:
    request = build_send_command_request(
        {
            "workload_id": "service-telemetry-listener",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-telemetry-listener@sha256:worker",
            "target_host_group": "evdash-msa",
            "deploy_method": "systemd",
            "healthcheck": {
                "kind": "command",
                "command": ["systemctl", "is-active", "service-telemetry-listener"],
                "expect_exit_code": 0,
            },
        }
    )

    commands = request["Parameters"]["commands"]
    assert any("release-manifest.json" in command for command in commands)
    assert any("systemctl start ev-dashboard-app-reconcile.service" in command for command in commands)
    assert any("service-telemetry-listener" in command for command in commands)


def test_send_command_request_uses_instance_ids_when_pre_resolved() -> None:
    request = build_send_command_request(
        {
            "workload_id": "front-web-console",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:demo",
            "target_host_group": "evdash-msa",
            "deploy_method": "compose",
            "healthcheck": {"kind": "http", "path": "/health", "expect_status": 200},
        },
        instance_ids=["i-abc123"],
    )

    assert request["InstanceIds"] == ["i-abc123"]
    assert "Targets" not in request


def test_preview_is_json_serializable() -> None:
    preview = render_ssm_command_preview(
        {
            "workload_id": "service-account-access",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-account-access@sha256:demo",
            "target_host_group": "evdash-msa",
            "deploy_method": "compose",
            "healthcheck": {
                "kind": "http",
                "path": "/internal/health",
                "expect_status": 200,
            },
        }
    )

    json.dumps(preview)
    assert preview["target"]["mode"] == "tag"


def test_resolve_online_instance_ids_for_host_group_filters_to_online_ssm_instances(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    completed_processes = [
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "Reservations": [
                        {
                            "Instances": [
                                {"InstanceId": "i-online"},
                                {"InstanceId": "i-offline"},
                            ]
                        }
                    ]
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "InstanceInformationList": [
                        {"InstanceId": "i-online", "PingStatus": "Online"},
                        {"InstanceId": "i-offline", "PingStatus": "ConnectionLost"},
                    ]
                }
            ),
            stderr="",
        ),
    ]

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        return completed_processes.pop(0)

    monkeypatch.setattr("release.dispatch_ssm.subprocess.run", fake_run)

    assert resolve_online_instance_ids_for_host_group("evdash-msa") == ["i-online"]


def test_ssm_comment_stays_within_validation_limit() -> None:
    request = build_send_command_request(
        {
            "workload_id": "service-announcement-registry",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-announcement-registry@sha256:a2979492e2eeca445112dc089f6bb36f20e8aa449c86bc91f4f0c0d88b19302b",
            "target_host_group": "evdash-msa",
            "deploy_method": "compose",
            "healthcheck": {
                "kind": "http",
                "path": "/internal/health",
                "expect_status": 200,
            },
        }
    )

    assert len(request["Comment"]) <= 100


def test_release_manifest_uses_timestamp_based_unique_release_id() -> None:
    plan_item = {
        "workload_id": "service-announcement-registry",
        "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-announcement-registry@sha256:a2979492e2eeca445112dc089f6bb36f20e8aa449c86bc91f4f0c0d88b19302b",
        "target_host_group": "evdash-msa",
        "deploy_method": "compose",
        "healthcheck": {
            "kind": "http",
            "path": "/internal/health",
            "expect_status": 200,
        },
    }

    manifest_a = build_runtime_release_manifest(plan_item)
    manifest_b = build_runtime_release_manifest(plan_item)

    assert manifest_a["releaseId"] != manifest_b["releaseId"]
    assert re.fullmatch(
        r"runtime-prod-release-service-announcement-registry-\d{8}T\d{6}\d{6}Z",
        manifest_a["releaseId"],
    )
    assert manifest_a["wave"] == 1
    assert manifest_a["waveLabel"] == "service-announcement-registry"


def test_release_manifest_reuses_explicit_manifest_id_and_excludes_it_from_config_revision() -> None:
    plan_item = {
        "workload_id": "edge-api-gateway",
        "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:abc123",
        "target_host_group": "edge-prod-a",
        "deploy_method": "compose",
        "healthcheck": {"kind": "http", "path": "/health", "expect_status": 200},
    }

    manifest = build_runtime_release_manifest(plan_item, manifest_id="manifest-1")

    assert manifest["releaseId"] == "manifest-1"
    assert build_applied_config_revision(plan_item) == build_applied_config_revision(
        {**plan_item, "manifest_id": "manifest-2"}
    )
    assert re.fullmatch(r"[0-9a-f]{64}", build_applied_config_revision(plan_item))


def test_dispatch_release_plan_returns_structured_evidence_records(monkeypatch: pytest.MonkeyPatch) -> None:
    plan_items = [
        {
            "workload_id": "front-web-console",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:demo",
            "target_host_group": "evdash-msa",
            "deploy_method": "compose",
            "healthcheck": {"kind": "http", "path": "/health", "expect_status": 200},
        }
    ]

    completed_processes = [
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {"Reservations": [{"Instances": [{"InstanceId": "i-frontend"}]}]}
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {"InstanceInformationList": [{"InstanceId": "i-frontend", "PingStatus": "Online"}]}
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-123"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "CommandInvocations": [
                        {
                            "Status": "Success",
                        }
                    ]
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "Parameter": {
                        "Value": json.dumps(
                            {
                                "front-web-console": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:old"
                            }
                        )
                    }
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Version": 1}),
            stderr="",
        ),
    ]
    seen_commands: list[list[str]] = []

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        seen_commands.append(args)
        return completed_processes.pop(0)

    monkeypatch.setattr("release.dispatch_ssm.subprocess.run", fake_run)

    results = dispatch_release_plan(plan_items)

    assert results == [
        {
            "workload_id": "front-web-console",
            "target_host_group": "evdash-msa",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:demo",
            "manifest_id": results[0]["manifest_id"],
            "applied_config_revision": results[0]["applied_config_revision"],
            "ssm_command_id": "cmd-123",
        }
    ]
    assert re.fullmatch(
        r"runtime-prod-release-front-web-console-\d{8}T\d{6}\d{6}Z",
        results[0]["manifest_id"],
    )
    assert re.fullmatch(r"[0-9a-f]{64}", results[0]["applied_config_revision"])
    assert seen_commands[0][:3] == ["aws", "ec2", "describe-instances"]
    assert seen_commands[1][:3] == ["aws", "ssm", "describe-instance-information"]
    assert seen_commands[2][:3] == ["aws", "ssm", "send-command"]
    assert any(args[:3] == ["aws", "ssm", "put-parameter"] for args in seen_commands)


def test_dispatch_release_plan_waits_for_rollout_command_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    plan_items = [
        {
            "workload_id": "edge-api-gateway",
            "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:demo",
            "target_host_group": "evdash-msa",
            "deploy_method": "compose",
            "healthcheck": {"kind": "http", "path": "/health", "expect_status": 200},
        }
    ]

    completed_processes = [
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {"Reservations": [{"Instances": [{"InstanceId": "i-edge"}]}]}
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {"InstanceInformationList": [{"InstanceId": "i-edge", "PingStatus": "Online"}]}
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-rollout-1"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "CommandInvocations": [
                        {
                            "Status": "InProgress",
                        }
                    ]
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "CommandInvocations": [
                        {
                            "Status": "Success",
                        }
                    ]
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "Parameter": {
                        "Value": json.dumps(
                            {
                                "edge-api-gateway": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:old"
                            }
                        )
                    }
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Version": 4}),
            stderr="",
        ),
    ]
    seen_commands: list[list[str]] = []

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        seen_commands.append(args)
        return completed_processes.pop(0)

    monkeypatch.setattr("release.dispatch_ssm.subprocess.run", fake_run)
    monkeypatch.setattr("release.dispatch_ssm.time.sleep", lambda _: None)

    results = dispatch_release_plan(plan_items)

    assert results[0]["ssm_command_id"] == "cmd-rollout-1"
    assert seen_commands[0][:3] == ["aws", "ec2", "describe-instances"]
    assert seen_commands[1][:3] == ["aws", "ssm", "describe-instance-information"]
    assert seen_commands[2][:3] == ["aws", "ssm", "send-command"]
    assert seen_commands[3][:3] == ["aws", "ssm", "list-command-invocations"]
    assert seen_commands[4][:3] == ["aws", "ssm", "list-command-invocations"]
    assert seen_commands[5][:3] == ["aws", "ssm", "get-parameter"]
    assert seen_commands[6][:3] == ["aws", "ssm", "put-parameter"]


def test_dispatch_mode_uses_rollout_order_from_resolved_payload(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    plan_path = tmp_path / "resolved-release-plan.json"
    plan_path.write_text(
        json.dumps(
            {
                "resolved_release_plan": [
                    {
                        "workload_id": "edge-api-gateway",
                        "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:edge",
                        "target_host_group": "evdash-msa",
                        "deploy_method": "compose",
                        "healthcheck": {"kind": "http", "path": "/health", "expect_status": 200},
                    },
                    {
                        "workload_id": "service-account-access",
                        "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-account-access@sha256:acct",
                        "target_host_group": "evdash-msa",
                        "deploy_method": "compose",
                        "healthcheck": {"kind": "http", "path": "/internal/health", "expect_status": 200},
                    },
                ],
                "rollout_order": [
                    "service-account-access",
                    "edge-api-gateway",
                ],
            }
        ),
        encoding="utf-8",
    )

    completed_processes = [
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Reservations": [{"Instances": [{"InstanceId": "i-acct"}]}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"InstanceInformationList": [{"InstanceId": "i-acct", "PingStatus": "Online"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-1"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"CommandInvocations": [{"Status": "Success"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Reservations": [{"Instances": [{"InstanceId": "i-edge"}]}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"InstanceInformationList": [{"InstanceId": "i-edge", "PingStatus": "Online"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-2"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"CommandInvocations": [{"Status": "Success"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "Parameter": {
                        "Value": json.dumps(
                            {
                                "edge-api-gateway": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:old-edge",
                                "service-account-access": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-account-access@sha256:old-acct",
                            }
                        )
                    }
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Version": 1}),
            stderr="",
        ),
    ]
    rollout_comments: list[str] = []

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        if args[:3] == ["aws", "ssm", "send-command"]:
            rollout_comments.append(json.loads(args[-1])["Comment"])
        return completed_processes.pop(0)

    monkeypatch.setattr("release.dispatch_ssm.subprocess.run", fake_run)

    payload = json.loads(plan_path.read_text(encoding="utf-8"))
    ordered_items = [item for workload_id in payload["rollout_order"] for item in payload["resolved_release_plan"] if item["workload_id"] == workload_id]
    dispatch_release_plan(ordered_items)

    assert rollout_comments == [
        "rollout service-account-access acct",
        "rollout edge-api-gateway edge",
    ]


def test_edge_readback_returns_null_when_edge_gateway_absent(tmp_path: Path) -> None:
    plan_path = tmp_path / "resolved-release-plan.json"
    plan_path.write_text(
        json.dumps(
            {
                "resolved_release_plan": [
                    {
                        "workload_id": "front-web-console",
                        "target_host_group": "evdash-msa",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    assert read_edge_api_docs_revision_from_runtime(plan_path) is None


def test_edge_readback_targets_running_edge_container_without_legacy_repo_path() -> None:
    request = build_edge_api_docs_read_request(
        {
            "workload_id": EDGE_WORKLOAD_ID,
            "target_host_group": "evdash-msa",
        }
    )

    commands = request["Parameters"]["commands"]

    assert commands == [
        "set -euo pipefail",
        EDGE_API_DOCS_READ_COMMAND,
    ]
    assert "docker exec edge-api-gateway sh -lc 'cat /opt/edge/public-api-docs/revision.json'" in commands[1]
    assert "/srv/clever/clever-msa-platform" not in commands[1]
    assert "docker compose" not in commands[1]


def test_edge_readback_executes_ssm_command_and_parses_revision(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    plan_path = tmp_path / "resolved-release-plan.json"
    plan_path.write_text(
        json.dumps(
            {
                "resolved_release_plan": [
                    {
                        "workload_id": EDGE_WORKLOAD_ID,
                        "target_host_group": "edge-prod-a",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    completed_processes = [
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Reservations": [{"Instances": [{"InstanceId": "i-edge"}]}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"InstanceInformationList": [{"InstanceId": "i-edge", "PingStatus": "Online"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-edge-1"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "CommandInvocations": [
                        {
                            "Status": "Success",
                            "StandardOutputContent": json.dumps(
                                {
                                    "edge_commit_sha": "abc123",
                                    "openapi_sha256": "def456",
                                    "service_export_manifest_sha": "ghi789",
                                }
                            ),
                        }
                    ]
                }
            ),
            stderr="",
        ),
    ]
    seen_commands: list[list[str]] = []

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        seen_commands.append(args)
        return completed_processes.pop(0)

    monkeypatch.setattr("release.dispatch_ssm.subprocess.run", fake_run)

    revision = read_edge_api_docs_revision_from_runtime(plan_path)

    assert revision == {
        "edge_commit_sha": "abc123",
        "openapi_sha256": "def456",
        "service_export_manifest_sha": "ghi789",
    }
    assert seen_commands[0][:3] == ["aws", "ec2", "describe-instances"]
    assert seen_commands[1][:3] == ["aws", "ssm", "describe-instance-information"]
    assert seen_commands[2][:3] == ["aws", "ssm", "send-command"]
    assert EDGE_API_DOCS_READ_COMMAND in json.dumps(seen_commands[2])
    assert seen_commands[3][:3] == ["aws", "ssm", "list-command-invocations"]


def test_post_release_runtime_state_request_is_json_serializable() -> None:
    request = build_post_release_runtime_state_request(
        {
            "workload_id": "front-web-console",
            "repo": "front-web-console",
            "target_host_group": "evdash-msa",
        }
    )

    json.dumps(request)
    assert request["Targets"] == [
        {"Key": "tag:CleverHostGroup", "Values": ["evdash-msa"]}
    ]
    assert request["Parameters"]["commands"][1] == "python3 - <<'PY'"


def test_post_release_runtime_state_joins_resolved_runtime_and_actual_digests(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    plan_path = tmp_path / "resolved-release-plan.json"
    plan_path.write_text(
        json.dumps(
            {
                "resolved_release_plan": [
                    {
                        "workload_id": "front-web-console",
                        "repo": "front-web-console",
                        "target_host_group": "evdash-msa",
                        "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    completed_processes = [
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "Parameter": {
                        "Value": json.dumps(
                            {
                                "front-web-console": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new"
                            }
                        )
                    }
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Reservations": [{"Instances": [{"InstanceId": "i-front"}]}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"InstanceInformationList": [{"InstanceId": "i-front", "PingStatus": "Online"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-state-1"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "CommandInvocations": [
                        {
                            "Status": "Success",
                            "StandardOutputContent": json.dumps(
                                {
                                    "workload_id": "front-web-console",
                                    "repo": "front-web-console",
                                    "actual_image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new",
                                    "container_name": "web-console",
                                    "config_image": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console",
                                    "smoke_result": "passed",
                                    "smoke_detail": "running image digest readback succeeded",
                                }
                            ),
                        }
                    ]
                }
            ),
            stderr="",
        ),
    ]

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        return completed_processes.pop(0)

    monkeypatch.setattr("release.dispatch_ssm.subprocess.run", fake_run)

    state = read_post_release_runtime_state_from_runtime(plan_path)

    assert state == [
        {
            "workload_id": "front-web-console",
            "target_host_group": "evdash-msa",
            "resolved_image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new",
            "runtime_image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new",
            "actual_image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new",
            "smoke_result": "passed",
            "smoke_detail": "running image digest readback succeeded",
            "container_name": "web-console",
            "config_image": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console",
        }
    ]


def test_post_release_runtime_state_reads_each_workload_separately(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    plan_path = tmp_path / "resolved-release-plan.json"
    plan_path.write_text(
        json.dumps(
            {
                "resolved_release_plan": [
                    {
                        "workload_id": "front-web-console",
                        "repo": "front-web-console",
                        "target_host_group": "evdash-msa",
                        "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new-front",
                    },
                    {
                        "workload_id": "edge-api-gateway",
                        "repo": "edge-api-gateway",
                        "target_host_group": "evdash-msa",
                        "image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:new-edge",
                    },
                ]
            }
        ),
        encoding="utf-8",
    )

    completed_processes = [
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "Parameter": {
                        "Value": json.dumps(
                            {
                                "front-web-console": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new-front",
                                "edge-api-gateway": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:new-edge",
                            }
                        )
                    }
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Reservations": [{"Instances": [{"InstanceId": "i-front"}]}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"InstanceInformationList": [{"InstanceId": "i-front", "PingStatus": "Online"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-state-front"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "CommandInvocations": [
                        {
                            "Status": "Success",
                            "StandardOutputContent": json.dumps(
                                {
                                    "workload_id": "front-web-console",
                                    "repo": "front-web-console",
                                    "actual_image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console@sha256:new-front",
                                    "container_name": "web-console",
                                    "config_image": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/front-web-console",
                                    "smoke_result": "passed",
                                    "smoke_detail": "running image digest readback succeeded",
                                }
                            ),
                        }
                    ]
                }
            ),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Reservations": [{"Instances": [{"InstanceId": "i-edge"}]}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"InstanceInformationList": [{"InstanceId": "i-edge", "PingStatus": "Online"}]}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps({"Command": {"CommandId": "cmd-state-edge"}}),
            stderr="",
        ),
        subprocess.CompletedProcess(
            args=["aws"],
            returncode=0,
            stdout=json.dumps(
                {
                    "CommandInvocations": [
                        {
                            "Status": "Success",
                            "StandardOutputContent": json.dumps(
                                {
                                    "workload_id": "edge-api-gateway",
                                    "repo": "edge-api-gateway",
                                    "actual_image_digest": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway@sha256:new-edge",
                                    "container_name": "edge-api-gateway",
                                    "config_image": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/edge-api-gateway",
                                    "smoke_result": "passed",
                                    "smoke_detail": "running image digest readback succeeded",
                                }
                            ),
                        }
                    ]
                }
            ),
            stderr="",
        ),
    ]
    seen_commands: list[list[str]] = []

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        seen_commands.append(args)
        return completed_processes.pop(0)

    monkeypatch.setattr("release.dispatch_ssm.subprocess.run", fake_run)

    state = read_post_release_runtime_state_from_runtime(plan_path)

    assert [item["workload_id"] for item in state] == [
        "front-web-console",
        "edge-api-gateway",
    ]
    send_commands = [args for args in seen_commands if args[:3] == ["aws", "ssm", "send-command"]]
    assert len(send_commands) == 2
