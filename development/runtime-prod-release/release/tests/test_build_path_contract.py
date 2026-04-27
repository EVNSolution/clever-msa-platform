from __future__ import annotations

from pathlib import Path


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
PLATFORM_ROOT = REPO_ROOT.parent


def iter_build_workflows() -> list[Path]:
    return sorted(PLATFORM_ROOT.glob("*/.github/workflows/build-image.yml"))


def test_all_build_repos_use_standard_build_role_variable() -> None:
    for workflow_path in iter_build_workflows():
        repo = workflow_path.parents[2].name
        workflow = workflow_path.read_text(encoding="utf-8")
        assert "vars.ECR_BUILD_AWS_ROLE_ARN" in workflow, repo
        assert "vars.GH_ACTIONS_ECR_BUILD_ROLE_ARN" not in workflow, repo


def test_all_build_repos_do_not_reference_prod_release_role() -> None:
    for workflow_path in iter_build_workflows():
        repo = workflow_path.parents[2].name
        workflow = workflow_path.read_text(encoding="utf-8")
        assert "PROD_AWS_ROLE_ARN" not in workflow, repo
