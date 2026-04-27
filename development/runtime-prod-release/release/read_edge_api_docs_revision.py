from __future__ import annotations

import json
from typing import Any


EDGE_API_DOCS_REVISION_KEYS = (
    "edge_commit_sha",
    "openapi_sha256",
    "service_export_manifest_sha",
)


def read_edge_api_docs_revision(shell_output: str) -> dict[str, str]:
    try:
        revision: Any = json.loads(shell_output.strip())
    except json.JSONDecodeError as exc:
        raise ValueError("invalid edge api docs revision payload") from exc

    if not isinstance(revision, dict):
        raise ValueError("edge api docs revision payload must be an object")

    unexpected = sorted(set(revision) - set(EDGE_API_DOCS_REVISION_KEYS))
    missing = sorted(set(EDGE_API_DOCS_REVISION_KEYS) - set(revision))
    if unexpected or missing:
        raise ValueError(
            "edge api docs revision payload must contain exactly "
            + ", ".join(EDGE_API_DOCS_REVISION_KEYS)
        )

    parsed_revision: dict[str, str] = {}
    for key in EDGE_API_DOCS_REVISION_KEYS:
        value = revision[key]
        if not isinstance(value, str):
            raise ValueError(f"{key} must be a string")
        parsed_revision[key] = value

    return parsed_revision
