#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys


SPECIAL_KINDS = {
    "edge-api-gateway": "edge",
    "front-web-console": "front-web",
}


def slice_kind(slice_name: str) -> str:
    return SPECIAL_KINDS.get(slice_name, "generic")


def matrix_entry(slice_name: str) -> dict[str, str]:
    return {
        "slice": slice_name,
        "path": f"development/{slice_name}",
        "ecr_repository": slice_name,
        "kind": slice_kind(slice_name),
    }


def discover_buildable_slices(root: Path) -> list[dict[str, str]]:
    development_root = root / "development"
    if not development_root.is_dir():
        return []

    entries: list[dict[str, str]] = []
    for path in sorted(development_root.iterdir()):
        if not path.is_dir():
            continue
        if not (path / "Dockerfile").is_file():
            continue
        entries.append(matrix_entry(path.name))
    return entries


def buildable_slice_names(root: Path) -> set[str]:
    return {entry["slice"] for entry in discover_buildable_slices(root)}


def matrix_json(entries: list[dict[str, str]]) -> str:
    return json.dumps({"include": entries}, separators=(",", ":"))


def changed_slice_names(changed_paths: list[str]) -> set[str]:
    slices: set[str] = set()
    for changed_path in changed_paths:
        parts = Path(changed_path).parts
        if len(parts) >= 2 and parts[0] == "development":
            slices.add(parts[1])
    return slices


def matrix_for_changed_paths(root: Path, changed_paths: list[str]) -> str:
    buildable = buildable_slice_names(root)
    selected = sorted(changed_slice_names(changed_paths) & buildable)
    return matrix_json([matrix_entry(slice_name) for slice_name in selected])


def matrix_for_manual_slice(root: Path, slice_name: str) -> str:
    normalized = slice_name.strip()
    if not normalized:
        return matrix_json(discover_buildable_slices(root))

    buildable = buildable_slice_names(root)
    if normalized not in buildable:
        print(
            f"{normalized} is not a buildable development slice with a Dockerfile",
            file=sys.stderr,
        )
        raise SystemExit(2)

    return matrix_json([matrix_entry(normalized)])


def changed_paths_from_git(root: Path, before: str, sha: str) -> list[str]:
    if before and set(before) != {"0"}:
        diff_range = [before, sha]
    else:
        diff_range = [f"{sha}~1", sha]

    result = subprocess.run(
        ["git", "diff", "--name-only", *diff_range],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return [entry["path"] for entry in discover_buildable_slices(root)]
    return [line for line in result.stdout.splitlines() if line.strip()]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--event-name", required=True)
    parser.add_argument("--before", default="")
    parser.add_argument("--sha", default="HEAD")
    parser.add_argument("--slice", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()

    if args.event_name == "workflow_dispatch":
        print(matrix_for_manual_slice(root, args.slice))
        return 0

    changed_paths = changed_paths_from_git(root, args.before, args.sha)
    print(matrix_for_changed_paths(root, changed_paths))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
