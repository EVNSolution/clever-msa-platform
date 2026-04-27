from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "prod-release.yml"


def test_prod_release_workflow_resolves_then_dispatches() -> None:
    workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    resolve_index = workflow.index("python release/resolve_release.py")
    dispatch_index = workflow.index(
        "python release/dispatch_ssm.py resolved-release-plan.json --mode dispatch > dispatch-results.json"
    )
    edge_readback_index = workflow.index(
        "python release/dispatch_ssm.py resolved-release-plan.json --mode edge-readback > edge-api-docs-revision.json"
    )
    post_release_state_index = workflow.index(
        "python release/dispatch_ssm.py resolved-release-plan.json --mode post-release-state > post-release-state.json"
    )
    evidence_index = workflow.index(
        "python release/evidence.py resolved-release-plan.json dispatch-results.json post-release-state.json"
    )
    validate_index = workflow.index("test -f dispatch-results.json")
    upload_index = workflow.index("uses: actions/upload-artifact@")

    assert (
        resolve_index
        < dispatch_index
        < edge_readback_index
        < post_release_state_index
        < evidence_index
        < validate_index
        < upload_index
    )
    assert "resolved-release-plan.json" in workflow
    assert "dispatch-results.json" in workflow
    assert "post-release-state.json" in workflow
    assert "release-evidence.json" in workflow
    assert "edge-api-docs-revision.json" in workflow
    assert "test -f post-release-state.json" in workflow
    assert "test -f release-evidence.json" in workflow
    assert "GH_ACTIONS_REPO_READ_TOKEN" in workflow
    assert "GH_ACTIONS_CLEVER_PLATFORM_READ_TOKEN" in workflow
    assert "if-no-files-found: ignore" in workflow
