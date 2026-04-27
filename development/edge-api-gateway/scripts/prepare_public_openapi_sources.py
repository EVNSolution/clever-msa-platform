#!/usr/bin/env python3

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

from build_public_openapi import EDGE_ROOT, BuildError, repo_root_env_var_name, service_registry_entries


def workspace_root() -> Path:
    github_workspace = os.environ.get("GITHUB_WORKSPACE")
    if github_workspace:
        return Path(github_workspace).resolve()
    return EDGE_ROOT.parent.resolve()


def append_github_env(name: str, value: str) -> None:
    github_env = os.environ.get("GITHUB_ENV")
    if not github_env:
        return
    with Path(github_env).open("a", encoding="utf-8") as handle:
        handle.write(f"{name}={value}\n")


def ensure_repo_checkout(repo: str, target_root: Path, token: str | None) -> Path:
    repo_root = (target_root / repo).resolve()
    if (repo_root / "manage.py").is_file():
        return repo_root

    monorepo_slice_root = (target_root / "development" / repo).resolve()
    if (monorepo_slice_root / "manage.py").is_file():
        return monorepo_slice_root

    if repo_root.exists():
        raise BuildError(f"{repo} checkout exists but manage.py is missing at {repo_root}")

    if monorepo_slice_root.exists():
        raise BuildError(
            f"{repo} monorepo slice exists but manage.py is missing at {monorepo_slice_root}"
        )

    if not token:
        raise BuildError(f"GH_REPO_READ_TOKEN is required to clone missing repo: {repo}")

    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--branch",
            "main",
            f"https://x-access-token:{token}@github.com/EVNSolution/{repo}.git",
            str(repo_root),
        ],
        check=True,
    )
    return repo_root


def main() -> int:
    token = os.environ.get("GH_REPO_READ_TOKEN")
    target_root = workspace_root()

    try:
        for source in service_registry_entries():
            repo = str(source["repo"])
            repo_root = ensure_repo_checkout(repo, target_root, token)
            env_var_name = repo_root_env_var_name(repo)
            os.environ[env_var_name] = str(repo_root)
            append_github_env(env_var_name, str(repo_root))
            print(f"{repo} -> {repo_root}")
    except BuildError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
