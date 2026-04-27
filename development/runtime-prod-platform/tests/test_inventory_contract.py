from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = REPO_ROOT / "release" / "prod-runtime-inventory.json"
EXPORT_SCRIPT = REPO_ROOT / "scripts" / "export-runtime-inventory.py"

EXPECTED_WORKLOADS = {
    "front-web-console",
    "edge-api-gateway",
    "service-account-access",
    "service-organization-registry",
    "service-driver-profile",
    "service-personnel-document-registry",
    "service-vehicle-registry",
    "service-vehicle-assignment",
    "service-vehicle-operations-view",
    "service-driver-operations-view",
    "service-terminal-registry",
    "service-telemetry-hub",
    "service-telemetry-listener",
    "service-telemetry-dead-letter",
    "service-settlement-registry",
    "service-attendance-registry",
    "service-delivery-record",
    "service-settlement-payroll",
    "service-settlement-operations-view",
    "service-settlement-inquiry",
    "service-dispatch-registry",
    "service-dispatch-operations-view",
    "service-region-registry",
    "service-region-analytics",
    "service-announcement-registry",
    "service-support-registry",
    "service-notification-hub",
}


def test_inventory_covers_all_active_workloads() -> None:
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))

    assert set(inventory["workloads"]) == EXPECTED_WORKLOADS
    assert inventory["workloads"]["front-web-console"]["workload_class"] == "entry"
    assert inventory["workloads"]["edge-api-gateway"]["workload_class"] == "entry"
    assert inventory["workloads"]["service-telemetry-listener"]["workload_class"] == "worker"


def test_export_script_writes_inventory_and_checksum(tmp_path: Path) -> None:
    subprocess.run(
        [sys.executable, str(EXPORT_SCRIPT), "--artifact-dir", str(tmp_path)],
        check=True,
        cwd=REPO_ROOT,
    )

    exported_inventory = tmp_path / "prod-runtime-inventory.json"
    exported_checksum = tmp_path / "prod-runtime-inventory.sha256"

    assert exported_inventory.exists()
    assert exported_checksum.exists()

    payload = exported_inventory.read_bytes()
    expected_sha = hashlib.sha256(payload).hexdigest()
    actual_sha = exported_checksum.read_text(encoding="utf-8").strip()
    assert actual_sha == expected_sha
