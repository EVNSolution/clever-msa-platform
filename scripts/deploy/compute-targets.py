#!/usr/bin/env python3
"""Compute deploy targets from changed files.

This script reads changed file paths (or git range) and emits a deployment
plan aligned with docs/mappings/central-deploy-catalog.yaml.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import subprocess
import sys
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG_PATH = REPO_ROOT / "docs" / "mappings" / "central-deploy-catalog.yaml"
ZERO_SHA = "0000000000000000000000000000000000000000"


def parse_catalog(path: Path) -> dict[str, dict]:
    text = path.read_text(encoding="utf-8").splitlines()
    catalog: dict[str, dict] = {}
    current: dict | None = None

    for line in text:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("- "):
            if current and "service_id" in current:
                catalog[current["service_id"]] = current
            current = {}
            key, _, value = stripped[2:].partition(":")
            key = key.strip()
            value = value.strip()
            if key != "service_id":
                raise ValueError("first item in each block must be service_id")
            if not value:
                raise ValueError("service_id must have inline value")
            current[key] = value
            continue

        if current is None:
            continue
        if ":" not in stripped:
            continue
        key, _, value = stripped.partition(":")
        if not key:
            continue
        value = value.strip()
        if not value:
            parsed = []
        elif value.startswith("[") and value.endswith("]"):
            parsed = ast.literal_eval(value)
            if not isinstance(parsed, list):
                raise ValueError(f"{key} should be list: {line}")
        else:
            parsed = value.strip("\"'")
            if key == "wave":
                parsed = int(parsed)
        current[key] = parsed

    if current and "service_id" in current:
        catalog[current["service_id"]] = current

    return catalog


def run_git_diff_files(base_sha: str, head_sha: str) -> list[str]:
    if not base_sha or not head_sha:
        return []
    if base_sha == ZERO_SHA and head_sha:
        # fallback for initial push events
        base_sha = f"{head_sha}~1"
    if base_sha == ZERO_SHA:
        return []
    result = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "diff", "--name-only", f"{base_sha}..{head_sha}"],
        capture_output=True,
        text=True,
        check=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def infer_targets_from_changes(changed_files: list[str]) -> set[str]:
    targets: set[str] = set()
    for path in changed_files:
        if path.startswith("docs/") or path.startswith(".github/") or path.startswith(".git/"):
            continue
        parts = path.split("/")
        if len(parts) < 2:
            continue
        if parts[0] == "development":
            repo = parts[1]
            if repo.startswith(("service-", "front-", "edge-api-gateway")):
                targets.add(repo)
        elif parts[0] in {"development"}:
            continue
        elif parts[0].startswith(("service-", "front-", "edge-api-gateway")):
            targets.add(parts[0])
        else:
            # unknown top-level changes are ignored for deploy targeting in v0.1
            continue
    return targets


def normalize_target(value: str) -> str | None:
    text = value.strip().strip("\"\',")
    if not text:
        return None
    if text.startswith("development/"):
        text = text.split("/", 1)[1]
    return text


def parse_target_override(value: str) -> set[str]:
    normalized_text = value.replace("\\n", ",").replace("\n", ",")
    return {
        normalized
        for normalized in (normalize_target(v) for v in normalized_text.split(","))
        if normalized
    }


def build_graph(selected: set[str], catalog: dict[str, dict]) -> dict[str, object]:
    by_wave: dict[int, set[str]] = defaultdict(set)
    for service_id in selected:
        entry = catalog[service_id]
        by_wave[int(entry.get("wave", 10))].add(service_id)

    ordered_services: list[tuple[str, int]] = []

    for wave in sorted(by_wave.keys()):
        services = sorted(by_wave[wave])
        if not services:
            continue

        indeg = {service: 0 for service in services}
        graph = {service: [] for service in services}
        for service in services:
            depends = set(catalog[service].get("depends_on", []))
            for dep in depends:
                if dep in services:
                    graph[dep].append(service)
                    indeg[service] += 1

        q = deque([s for s in sorted(services) if indeg[s] == 0])
        count = 0
        while q:
            service = q.popleft()
            ordered_services.append((service, wave))
            count += 1
            for nxt in graph[service]:
                indeg[nxt] -= 1
                if indeg[nxt] == 0:
                    q.append(nxt)

        if count != len(services):
            raise RuntimeError(f"dependency cycle detected in wave {wave}")

    return {
        "by_wave": {w: sorted(list(s)) for w, s in by_wave.items()},
        "ordered": ordered_services,
    }


def make_payload(selected: set[str], catalog: dict[str, dict], ordered, base_sha: str, head_sha: str, changed_files: list[str], docs_only: bool, output_path: str | None) -> str:
    waves = []
    by_wave = ordered["by_wave"]
    for wave in sorted(by_wave.keys()):
        services = []
        for service_id in by_wave[wave]:
            entry = catalog[service_id]
            services.append(
                {
                    "service_id": service_id,
                    "runtime": entry.get("runtime"),
                    "depends_on": entry.get("depends_on", []),
                    "artifact": entry.get("artifact"),
                    "wave": wave,
                    "compose_service": entry.get("compose_service", ""),
                    "compose_file": entry.get("compose_file", ""),
                    "remote_repo_dir": entry.get("remote_repo_dir", ""),
                    "instance_selector": entry.get("instance_selector", ""),
                    "remote_health_command": entry.get("remote_health_command", ""),
                    "deploy_command": entry.get("deploy_command"),
                    "rollback_command": entry.get("rollback_command"),
                }
            )
        if services:
            waves.append({"wave": wave, "services": services})

    payload = {
        "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "base_sha": base_sha,
        "head_sha": head_sha,
        "docs_only_change": docs_only,
        "changed_files": changed_files,
        "target_count": len(selected),
        "deploy_order": [service for service, _ in ordered["ordered"]],
        "waves": waves,
    }

    out = json.dumps(payload, ensure_ascii=False, indent=2)
    if output_path:
        Path(output_path).write_text(out + "\n", encoding="utf-8")
    return out


def collect_changes(args: argparse.Namespace, has_explicit_targets: bool) -> tuple[str, str, list[str], bool]:
    base_sha = args.base_sha or os.getenv("GITHUB_BASE_SHA", "")
    head_sha = args.head_sha or os.getenv("GITHUB_SHA", "")

    if args.changes_file:
        files = Path(args.changes_file).read_text(encoding="utf-8").splitlines()
        return base_sha, head_sha, [f.strip() for f in files if f.strip()], False

    if has_explicit_targets:
        return base_sha, head_sha, [], False

    if base_sha and head_sha and args.use_git_diff:
        return base_sha, head_sha, run_git_diff_files(base_sha, head_sha), False

    stdin = sys.stdin.read().splitlines()
    if stdin:
        return base_sha, head_sha, [f.strip() for f in stdin if f.strip()], False

    return base_sha, head_sha, [], True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-sha", default="")
    parser.add_argument("--head-sha", default="")
    parser.add_argument("--changes-file", default="")
    parser.add_argument("--targets", default="")
    parser.add_argument("--catalog", default=str(DEFAULT_CATALOG_PATH))
    parser.add_argument("--output", default="")
    parser.add_argument("--include-docs", action="store_true")
    parser.add_argument("--use-git-diff", action="store_true", default=True)
    args = parser.parse_args()

    explicit_targets: set[str] = parse_target_override(args.targets)
    base_sha, head_sha, changed_files, docs_only = collect_changes(
        args, has_explicit_targets=bool(explicit_targets)
    )

    catalog = parse_catalog(Path(args.catalog))

    if explicit_targets:
        selected = {
            target for target in explicit_targets if target in catalog
        }
        unknown = sorted(explicit_targets - selected)
        if unknown:
            print(
                f"WARN: explicit target not in catalog: {', '.join(unknown)}",
                file=sys.stderr,
            )
        changed_files = sorted(f"development/{target}/README.md" for target in selected)
        docs_only = False
    elif not changed_files:
        docs_only = True

    targets = infer_targets_from_changes(changed_files)
    if explicit_targets:
        selected = {
            target for target in explicit_targets if target in catalog
        }
    elif not targets:
        selected = set()
        if changed_files and not args.include_docs and all(
            path.startswith("docs/") for path in changed_files if path.strip()
        ):
            docs_only = True
    else:
        selected = set(target for target in targets if target in catalog)
        unknown = sorted(targets - selected)
        if unknown:
            print(f"WARN: target repo not in catalog: {', '.join(unknown)}", file=sys.stderr)

    if docs_only:
        payload = {
            "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "base_sha": base_sha,
            "head_sha": head_sha,
            "docs_only_change": True,
            "target_count": 0,
            "deploy_order": [],
            "waves": [],
            "changed_files": changed_files,
            "reason": "No deployable targets found",
        }
        output = json.dumps(payload, indent=2) + "\n"
        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
        print(output, end="")
        return 0

    if not selected:
        selected = set()

    ordered = build_graph(selected, catalog)
    result = make_payload(
        selected=selected,
        catalog=catalog,
        ordered=ordered,
        base_sha=base_sha,
        head_sha=head_sha,
        changed_files=changed_files,
        docs_only=docs_only,
        output_path=args.output,
    )
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
