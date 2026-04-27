from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator, ValidationError


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
SCHEMA_DIR = REPO_ROOT / "release" / "schema"
sys.path.insert(0, str(REPO_ROOT))


def load_schema(name: str) -> dict:
    return json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))


def test_release_evidence_schema_allows_optional_api_docs_revision_for_non_edge_workloads() -> None:
    schema = load_schema("release-evidence.schema.json")

    Draft202012Validator(schema).validate(
        {
            "workload_id": "front-web-console",
            "target_host_group": "evdash-msa",
            "image_digest": "sha256:demo",
            "runtime_image_digest": "sha256:demo",
            "actual_image_digest": "sha256:demo",
            "manifest_id": "manifest-1",
            "approver": "operator",
            "ssm_command_id": "cmd-1",
            "applied_config_revision": "cfg-1",
            "smoke_result": "passed",
            "image_consistency": {
                "resolved_equals_runtime": True,
                "runtime_equals_actual": True,
                "resolved_equals_actual": True,
                "passed": True,
            },
            "timestamp": "2026-04-20T12:00:00Z",
        }
    )


def test_release_evidence_schema_requires_api_docs_revision_for_edge_gateway() -> None:
    schema = load_schema("release-evidence.schema.json")

    with pytest.raises(ValidationError):
        Draft202012Validator(schema).validate(
            {
                "workload_id": "edge-api-gateway",
                "target_host_group": "evdash-msa",
                "image_digest": "sha256:demo",
                "runtime_image_digest": "sha256:demo",
                "actual_image_digest": "sha256:demo",
                "manifest_id": "manifest-1",
                "approver": "operator",
                "ssm_command_id": "cmd-1",
                "applied_config_revision": "cfg-1",
                "smoke_result": "passed",
                "image_consistency": {
                    "resolved_equals_runtime": True,
                    "runtime_equals_actual": True,
                    "resolved_equals_actual": True,
                    "passed": True,
                },
                "timestamp": "2026-04-20T12:00:00Z",
            }
        )


def test_release_evidence_schema_requires_exact_edge_api_docs_revision_keys() -> None:
    schema = load_schema("release-evidence.schema.json")

    with pytest.raises(ValidationError):
        Draft202012Validator(schema).validate(
            {
                "workload_id": "edge-api-gateway",
                "target_host_group": "evdash-msa",
                "image_digest": "sha256:demo",
                "runtime_image_digest": "sha256:demo",
                "actual_image_digest": "sha256:demo",
                "manifest_id": "manifest-1",
                "approver": "operator",
                "ssm_command_id": "cmd-1",
                "applied_config_revision": "cfg-1",
                "api_docs_revision": {
                    "edge_commit_sha": "abc123",
                    "openapi_sha256": "def456",
                    "service_export_manifest_sha": "ghi789",
                    "extra": "nope",
                },
                "smoke_result": "passed",
                "image_consistency": {
                    "resolved_equals_runtime": True,
                    "runtime_equals_actual": True,
                    "resolved_equals_actual": True,
                    "passed": True,
                },
                "timestamp": "2026-04-20T12:00:00Z",
            }
        )
