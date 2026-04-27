from __future__ import annotations

import sys
from pathlib import Path


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
PLATFORM_ROOT = REPO_ROOT.parent
sys.path.insert(0, str(REPO_ROOT))

from release.resolve_release import build_resolve_only_output


INVENTORY_PATH = (
    PLATFORM_ROOT / "runtime-prod-platform" / "release" / "prod-runtime-inventory.json"
)


def test_resolve_only_output_contains_plan_rollout_order_and_ssm_preview() -> None:
    output = build_resolve_only_output(
        [
            {
                "workload_id": "front-web-console",
                "repo": "front-web-console",
                "image_digest": "sha256:demo",
                "release_reason": "resolve-only",
            }
        ],
        INVENTORY_PATH,
        PLATFORM_ROOT,
    )

    assert "resolved_release_plan" in output
    assert "rollout_order" in output
    assert "ssm_command_preview" in output
    assert output["rollout_order"] == [
        "service-account-access",
        "edge-api-gateway",
        "front-web-console",
    ]
    assert output["ssm_command_preview"][0]["target"]["mode"] == "tag"


def test_resolve_only_preview_never_uses_instance_id_targeting() -> None:
    output = build_resolve_only_output(
        [
            {
                "workload_id": "service-settlement-payroll",
                "repo": "service-settlement-payroll",
                "image_digest": "sha256:demo",
                "release_reason": "resolve-only",
            }
        ],
        INVENTORY_PATH,
        PLATFORM_ROOT,
    )

    assert all(
        preview["target"]["mode"] == "tag" for preview in output["ssm_command_preview"]
    )
