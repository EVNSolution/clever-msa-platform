from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
PLATFORM_ROOT = REPO_ROOT.parent
sys.path.insert(0, str(REPO_ROOT))

from release.resolve_release import (
    ReleaseResolutionError,
    build_resolve_only_output,
    load_workload_metadata_for_repo,
    expand_release_set,
    resolve_release_item,
)


SCHEMA_DIR = REPO_ROOT / "release" / "schema"
INVENTORY_PATH = (
    PLATFORM_ROOT / "runtime-prod-platform" / "release" / "prod-runtime-inventory.json"
)


def load_schema(name: str) -> dict:
    return json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))


def test_release_intent_schema_contains_only_operator_input_fields() -> None:
    schema = load_schema("release-intent.schema.json")

    assert set(schema["required"]) == {
        "workload_id",
        "repo",
        "release_reason",
    }
    assert "image_digest" in schema["properties"]
    assert "target_host_group" not in schema["properties"]
    assert "deploy_method" not in schema["properties"]
    assert schema["additionalProperties"] is False


def test_resolved_release_plan_schema_contains_only_system_resolved_fields() -> None:
    schema = load_schema("resolved-release-plan.schema.json")

    assert set(schema["required"]) == {
        "workload_id",
        "repo",
        "image_digest",
        "target_host_group",
        "deploy_method",
        "healthcheck",
        "rollback_target",
    }
    assert "release_reason" not in schema["properties"]
    assert schema["additionalProperties"] is False


def test_resolver_rejects_operator_supplied_host_group_and_deploy_method() -> None:
    with pytest.raises(ReleaseResolutionError):
        resolve_release_item(
            {
                "workload_id": "front-web-console",
                "repo": "front-web-console",
                "image_digest": "sha256:demo",
                "release_reason": "test",
                "target_host_group": "ad-hoc-hosts",
                "deploy_method": "systemd",
            },
            INVENTORY_PATH,
        )


def test_release_unit_is_workload_id_and_repo_is_metadata_only() -> None:
    resolved = resolve_release_item(
        {
            "workload_id": "front-web-console",
            "repo": "front-web-console",
            "image_digest": "sha256:demo",
            "release_reason": "test",
        },
        INVENTORY_PATH,
    )

    assert resolved["workload_id"] == "front-web-console"
    assert resolved["repo"] == "front-web-console"
    assert resolved["target_host_group"] == "evdash-msa"
    assert resolved["deploy_method"] == "compose"


def test_entry_impact_expands_to_entry_bundle() -> None:
    expanded = expand_release_set(
        [
            {
                "workload_id": "front-web-console",
                "repo": "front-web-console",
                "image_digest": "sha256:demo",
                "release_reason": "entry-change",
            }
        ],
        PLATFORM_ROOT,
    )

    assert {item["workload_id"] for item in expanded} == {
        "front-web-console",
        "edge-api-gateway",
        "service-account-access",
    }


def test_expansion_does_not_propagate_parent_image_digest() -> None:
    expanded = expand_release_set(
        [
            {
                "workload_id": "front-web-console",
                "repo": "front-web-console",
                "image_digest": "sha256:front-override",
                "release_reason": "entry-change",
            }
        ],
        PLATFORM_ROOT,
    )

    expanded_by_workload = {
        item["workload_id"]: item for item in expanded
    }
    assert expanded_by_workload["front-web-console"]["image_digest"] == "sha256:front-override"
    assert "image_digest" not in expanded_by_workload["edge-api-gateway"]
    assert "image_digest" not in expanded_by_workload["service-account-access"]


def test_read_model_impact_expands_to_operations_view() -> None:
    expanded = expand_release_set(
        [
            {
                "workload_id": "service-settlement-payroll",
                "repo": "service-settlement-payroll",
                "image_digest": "sha256:demo",
                "release_reason": "read-model-change",
            }
        ],
        PLATFORM_ROOT,
    )

    assert {item["workload_id"] for item in expanded} == {
        "service-settlement-payroll",
        "service-settlement-operations-view",
    }


def test_resolver_prefers_explicit_image_digest_override(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_latest(_repo: str) -> str:
        raise AssertionError("latest digest resolver must not be called")

    def fail_runtime(_workload_id: str) -> str:
        raise AssertionError("runtime fallback must not be called")

    monkeypatch.setattr("release.resolve_release.resolve_latest_successful_main_image_digest", fail_latest)
    monkeypatch.setattr("release.resolve_release.resolve_current_runtime_image_digest", fail_runtime)

    resolved = resolve_release_item(
        {
            "workload_id": "front-web-console",
            "repo": "front-web-console",
            "image_digest": "sha256:override",
            "release_reason": "explicit-override",
        },
        INVENTORY_PATH,
    )

    assert resolved["image_digest"] == "sha256:override"


def test_resolver_uses_latest_successful_main_digest_when_override_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "release.resolve_release.resolve_latest_successful_main_image_digest",
        lambda repo: f"sha256:latest-for-{repo}",
    )
    monkeypatch.setattr(
        "release.resolve_release.resolve_current_runtime_image_digest",
        lambda workload_id: f"sha256:runtime-for-{workload_id}",
    )

    resolved = resolve_release_item(
        {
            "workload_id": "edge-api-gateway",
            "repo": "edge-api-gateway",
            "release_reason": "auto-latest",
        },
        INVENTORY_PATH,
    )

    assert resolved["image_digest"] == "sha256:latest-for-edge-api-gateway"


def test_resolver_falls_back_to_current_runtime_digest_when_latest_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_latest(repo: str) -> str:
        raise ReleaseResolutionError(f"no successful main build for {repo}")

    monkeypatch.setattr("release.resolve_release.resolve_latest_successful_main_image_digest", fail_latest)
    monkeypatch.setattr(
        "release.resolve_release.resolve_current_runtime_image_digest",
        lambda workload_id: f"sha256:runtime-for-{workload_id}",
    )

    resolved = resolve_release_item(
        {
            "workload_id": "service-account-access",
            "repo": "service-account-access",
            "release_reason": "fallback-runtime",
        },
        INVENTORY_PATH,
    )

    assert resolved["image_digest"] == "sha256:runtime-for-service-account-access"


def test_missing_workload_metadata_defaults_to_neutral_no_expansion(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        "release.resolve_release.fetch_workload_metadata_from_github",
        lambda repo: (_ for _ in ()).throw(
            ReleaseResolutionError(f"unable to fetch workload metadata for {repo}: 404")
        ),
    )

    metadata = load_workload_metadata_for_repo(tmp_path, "service-delivery-record")

    assert metadata == {
        "workload_id": "service-delivery-record",
        "workload_class": "core-api",
        "entry_impact": False,
        "public_api_contract_impact": False,
        "read_model_impact": False,
        "async_event_impact": False,
        "runtime_config_gate": False,
        "depends_on_workloads": [],
        "expands_to_workloads": [],
    }


def test_resolve_only_output_rollout_order_differs_from_storage_order() -> None:
    output = build_resolve_only_output(
        [
            {
                "workload_id": "front-web-console",
                "repo": "front-web-console",
                "release_reason": "entry-change",
            }
        ],
        INVENTORY_PATH,
        PLATFORM_ROOT,
    )

    assert [item["workload_id"] for item in output["resolved_release_plan"]] == [
        "edge-api-gateway",
        "front-web-console",
        "service-account-access",
    ]
    assert output["rollout_order"] == [
        "service-account-access",
        "edge-api-gateway",
        "front-web-console",
    ]
