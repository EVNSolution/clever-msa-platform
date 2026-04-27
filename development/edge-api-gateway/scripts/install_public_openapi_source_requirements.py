#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path
import subprocess
import sys

from build_public_openapi import EDGE_ROOT, BuildError, resolve_source_repo_root, service_registry_entries


def main() -> int:
    installed: set[Path] = set()

    try:
        for source in service_registry_entries():
            repo_root = resolve_source_repo_root(EDGE_ROOT, source)
            requirements_path = repo_root / "requirements.txt"
            if not requirements_path.is_file():
                raise BuildError(f"Missing requirements.txt for {source['service_id']} at {requirements_path}")
            if requirements_path in installed:
                continue

            subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", str(requirements_path)],
                check=True,
            )
            installed.add(requirements_path)
            print(f"installed {requirements_path}")
    except BuildError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
