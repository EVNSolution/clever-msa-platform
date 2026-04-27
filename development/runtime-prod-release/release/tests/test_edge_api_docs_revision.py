from __future__ import annotations

import sys
from pathlib import Path

import pytest


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from release.read_edge_api_docs_revision import read_edge_api_docs_revision


def test_reads_revision_payload_from_shell_output() -> None:
    payload = """
    {
      "edge_commit_sha": "abc123",
      "openapi_sha256": "def456",
      "service_export_manifest_sha": "ghi789"
    }
    """

    assert read_edge_api_docs_revision(payload) == {
        "edge_commit_sha": "abc123",
        "openapi_sha256": "def456",
        "service_export_manifest_sha": "ghi789",
    }


@pytest.mark.parametrize(
    ("payload", "expected_message"),
    [
        (
            '{"edge_commit_sha":"abc123","openapi_sha256":"def456"}',
            "exactly",
        ),
        (
            '{"edge_commit_sha":"abc123","openapi_sha256":"def456","service_export_manifest_sha":"ghi789","extra":"nope"}',
            "exactly",
        ),
    ],
)
def test_rejects_revision_payloads_with_wrong_key_set(
    payload: str,
    expected_message: str,
) -> None:
    with pytest.raises(ValueError, match=expected_message):
        read_edge_api_docs_revision(payload)
