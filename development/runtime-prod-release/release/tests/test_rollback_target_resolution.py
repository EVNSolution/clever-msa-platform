from __future__ import annotations

import sys
from pathlib import Path

import pytest


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from release.evidence import load_evidence, select_last_successful_release_item
from release.evidence import build_release_evidence


def test_selects_last_successful_release_item_for_same_workload() -> None:
    selected = select_last_successful_release_item(
        "front-web-console",
        [
            {
                "workload_id": "front-web-console",
                "image_digest": "sha256:older",
                "applied_config_revision": "cfg-1",
                "smoke_result": "passed",
                "timestamp": "2026-04-19T11:00:00Z",
            },
            {
                "workload_id": "front-web-console",
                "image_digest": "sha256:newer",
                "applied_config_revision": "cfg-2",
                "smoke_result": "passed",
                "timestamp": "2026-04-19T12:00:00Z",
            },
        ],
    )

    assert selected["image_digest"] == "sha256:newer"


def test_incomplete_evidence_is_rejected() -> None:
    with pytest.raises(ValueError):
        select_last_successful_release_item(
            "front-web-console",
            [
                {
                    "workload_id": "front-web-console",
                    "image_digest": "sha256:missing-config",
                    "smoke_result": "passed",
                    "timestamp": "2026-04-19T12:00:00Z",
                }
            ],
        )


def test_load_evidence_accepts_non_edge_records_without_api_docs_revision(
    tmp_path: Path,
) -> None:
    evidence_path = tmp_path / "release-evidence.json"
    evidence_path.write_text(
        """
        [
          {
            "workload_id": "front-web-console",
            "image_digest": "sha256:demo",
            "applied_config_revision": "cfg-1",
            "smoke_result": "passed",
            "timestamp": "2026-04-19T12:00:00Z"
          }
        ]
        """,
        encoding="utf-8",
    )

    items = load_evidence(evidence_path)

    assert items[0]["workload_id"] == "front-web-console"


def test_load_evidence_rejects_edge_gateway_records_missing_api_docs_revision(
    tmp_path: Path,
) -> None:
    evidence_path = tmp_path / "release-evidence.json"
    evidence_path.write_text(
        """
        [
          {
            "workload_id": "edge-api-gateway",
            "image_digest": "sha256:demo",
            "applied_config_revision": "cfg-1",
            "smoke_result": "passed",
            "timestamp": "2026-04-19T12:00:00Z"
          }
        ]
        """,
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="api_docs_revision"):
        load_evidence(evidence_path)


def test_build_release_evidence_merges_dispatch_results_and_optional_edge_revision() -> None:
    evidence_items = build_release_evidence(
        resolved_plan_items=[
            {
                "workload_id": "front-web-console",
                "target_host_group": "evdash-msa",
                "image_digest": "sha256:front",
            },
            {
                "workload_id": "edge-api-gateway",
                "target_host_group": "edge-prod-a",
                "image_digest": "sha256:edge",
            },
        ],
        dispatch_results=[
            {
                "workload_id": "front-web-console",
                "target_host_group": "evdash-msa",
                "image_digest": "sha256:front",
                "manifest_id": "manifest-front",
                "applied_config_revision": "cfg-front",
                "ssm_command_id": "cmd-front",
            },
            {
                "workload_id": "edge-api-gateway",
                "target_host_group": "edge-prod-a",
                "image_digest": "sha256:edge",
                "manifest_id": "manifest-edge",
                "applied_config_revision": "cfg-edge",
                "ssm_command_id": "cmd-edge",
            },
        ],
        post_release_state=[
            {
                "workload_id": "front-web-console",
                "runtime_image_digest": "sha256:front",
                "actual_image_digest": "sha256:front",
                "smoke_result": "passed",
            },
            {
                "workload_id": "edge-api-gateway",
                "runtime_image_digest": "sha256:edge",
                "actual_image_digest": "sha256:edge",
                "smoke_result": "passed",
            },
        ],
        approver="operator",
        edge_api_docs_revision={
            "edge_commit_sha": "abc123",
            "openapi_sha256": "def456",
            "service_export_manifest_sha": "ghi789",
        },
        timestamp="2026-04-20T12:00:00Z",
    )

    assert evidence_items == [
        {
            "workload_id": "front-web-console",
            "target_host_group": "evdash-msa",
            "image_digest": "sha256:front",
            "runtime_image_digest": "sha256:front",
            "actual_image_digest": "sha256:front",
            "manifest_id": "manifest-front",
            "approver": "operator",
            "ssm_command_id": "cmd-front",
            "applied_config_revision": "cfg-front",
            "smoke_result": "passed",
            "image_consistency": {
                "resolved_equals_runtime": True,
                "runtime_equals_actual": True,
                "resolved_equals_actual": True,
                "passed": True,
            },
            "timestamp": "2026-04-20T12:00:00Z",
        },
        {
            "workload_id": "edge-api-gateway",
            "target_host_group": "edge-prod-a",
            "image_digest": "sha256:edge",
            "runtime_image_digest": "sha256:edge",
            "actual_image_digest": "sha256:edge",
            "manifest_id": "manifest-edge",
            "approver": "operator",
            "ssm_command_id": "cmd-edge",
            "applied_config_revision": "cfg-edge",
            "api_docs_revision": {
                "edge_commit_sha": "abc123",
                "openapi_sha256": "def456",
                "service_export_manifest_sha": "ghi789",
            },
            "smoke_result": "passed",
            "image_consistency": {
                "resolved_equals_runtime": True,
                "runtime_equals_actual": True,
                "resolved_equals_actual": True,
                "passed": True,
            },
            "timestamp": "2026-04-20T12:00:00Z",
        },
    ]
