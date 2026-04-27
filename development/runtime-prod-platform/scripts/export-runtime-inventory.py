#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def load_inventory(repo_root: Path) -> dict:
    inventory_path = repo_root / "release" / "prod-runtime-inventory.json"
    with inventory_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def canonical_inventory_bytes(inventory: dict) -> bytes:
    return (json.dumps(inventory, indent=2, sort_keys=True) + "\n").encode("utf-8")


def write_artifact_bundle(repo_root: Path, artifact_dir: Path) -> None:
    inventory = load_inventory(repo_root)
    payload = canonical_inventory_bytes(inventory)
    digest = hashlib.sha256(payload).hexdigest()

    artifact_dir.mkdir(parents=True, exist_ok=True)
    (artifact_dir / "prod-runtime-inventory.json").write_bytes(payload)
    (artifact_dir / "prod-runtime-inventory.sha256").write_text(
        digest + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-dir", type=Path)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    inventory = load_inventory(repo_root)
    payload = canonical_inventory_bytes(inventory)

    if args.artifact_dir is not None:
        write_artifact_bundle(repo_root, args.artifact_dir)
        return

    print(payload.decode("utf-8"), end="")


if __name__ == "__main__":
    main()
