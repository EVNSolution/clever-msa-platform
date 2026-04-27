from __future__ import annotations

import sys
from pathlib import Path

import pytest


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
PLATFORM_ROOT = REPO_ROOT.parent
sys.path.insert(0, str(REPO_ROOT))

from release.resolve_release import ReleaseResolutionError, resolve_inventory_item


INVENTORY_PATH = (
    PLATFORM_ROOT / "runtime-prod-platform" / "release" / "prod-runtime-inventory.json"
)


def test_inventory_resolves_target_host_group_and_deploy_method() -> None:
    resolved = resolve_inventory_item("front-web-console", INVENTORY_PATH)

    assert resolved["target_host_group"] == "evdash-msa"
    assert resolved["workload_class"] == "entry"
    assert resolved["deploy_method"] == "compose"
    assert resolved["healthcheck"]["path"] == "/health"


def test_inventory_resolves_core_api_to_compose() -> None:
    resolved = resolve_inventory_item("service-settlement-payroll", INVENTORY_PATH)

    assert resolved["workload_class"] == "core-api"
    assert resolved["deploy_method"] == "compose"
    assert resolved["target_host_group"] == "evdash-msa"


def test_unknown_workload_fails_hard() -> None:
    with pytest.raises(ReleaseResolutionError):
        resolve_inventory_item("missing-workload", INVENTORY_PATH)
