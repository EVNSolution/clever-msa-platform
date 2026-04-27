#!/usr/bin/env python3

from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
from typing import Any

try:
    import yaml
except ModuleNotFoundError as exc:  # pragma: no cover - depends on local environment
    yaml = None
    YAML_IMPORT_ERROR = exc
else:
    YAML_IMPORT_ERROR = None


EDGE_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DOCS_ROOT = EDGE_ROOT / "public-api-docs"
REFERENCE_CONTRACT_PATH = EDGE_ROOT / "tests" / "fixtures" / "pre-cutover-public-openapi.yaml"
PUBLIC_OPENAPI_REQUIREMENTS_PATH = EDGE_ROOT / "requirements-public-openapi.txt"
HTTP_METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
NON_CONTRACT_OPERATION_KEYS = {
    "description",
    "examples",
    "operationId",
    "servers",
    "summary",
    "tags",
}


class ParityError(RuntimeError):
    pass


def require_yaml_dependency() -> None:
    if YAML_IMPORT_ERROR is None:
        return

    raise ParityError(
        "PyYAML is required for the public OpenAPI scripts. "
        f"Run them with the active `python` interpreter that has {PUBLIC_OPENAPI_REQUIREMENTS_PATH.name} installed."
    ) from YAML_IMPORT_ERROR


def load_yaml_document(path: Path) -> dict[str, Any]:
    require_yaml_dependency()
    with path.open(encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    if not isinstance(document, dict):
        raise ParityError(f"Expected YAML object at {path}, got {type(document).__name__}")
    return document


def load_json_document(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        document = json.load(handle)
    if not isinstance(document, dict):
        raise ParityError(f"Expected JSON object at {path}, got {type(document).__name__}")
    return document


def write_json_document(path: Path, document: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(document, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def canonicalize_json(document: Any) -> str:
    return json.dumps(document, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def resolve_local_ref(document: dict[str, Any], ref: str) -> Any:
    current: Any = document
    for raw_part in ref[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or part not in current:
            raise ParityError(f"Unresolved $ref {ref}")
        current = current[part]
    return current


def expand_local_refs(node: Any, document: dict[str, Any], seen_refs: tuple[str, ...] = ()) -> Any:
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/"):
            if ref in seen_refs:
                return {"$ref": ref}

            resolved = copy.deepcopy(resolve_local_ref(document, ref))
            sibling_items = {
                key: value
                for key, value in node.items()
                if key != "$ref"
            }
            if sibling_items:
                if not isinstance(resolved, dict):
                    raise ParityError(f"Cannot merge sibling keys into non-object ref target {ref}")
                resolved.update(copy.deepcopy(sibling_items))
            return expand_local_refs(resolved, document, seen_refs + (ref,))

        return {
            key: expand_local_refs(value, document, seen_refs)
            for key, value in node.items()
        }

    if isinstance(node, list):
        return [expand_local_refs(item, document, seen_refs) for item in node]

    return node


def strip_ignored_contract_fields(node: Any) -> Any:
    if isinstance(node, dict):
        return {
            key: strip_ignored_contract_fields(value)
            for key, value in node.items()
            if key not in NON_CONTRACT_OPERATION_KEYS
        }

    if isinstance(node, list):
        return [strip_ignored_contract_fields(item) for item in node]

    return node


def normalize_operation_contract(
    document: dict[str, Any],
    path_item: dict[str, Any],
    operation: dict[str, Any],
) -> dict[str, Any]:
    normalized = strip_ignored_contract_fields(copy.deepcopy(operation))

    if "parameters" in path_item:
        normalized["path_parameters"] = strip_ignored_contract_fields(
            copy.deepcopy(path_item["parameters"])
        )

    return expand_local_refs(normalized, document)


def fallback_allows_schema_mismatch(
    fallback_entries_used: list[dict[str, Any]],
    path: str,
    method: str,
) -> bool:
    for entry in fallback_entries_used:
        if str(entry.get("path")) != path:
            continue
        if str(entry.get("method", "")).lower() != method:
            continue
        return True
    return False


def build_initial_report(fallback_entries_used: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "status": "passed",
        "missing_paths": [],
        "extra_paths": [],
        "method_mismatches": [],
        "status_code_mismatches": [],
        "schema_mismatches": [],
        "fallback_entries_used": copy.deepcopy(fallback_entries_used),
    }


def compare_openapi_documents(
    reference_document: dict[str, Any],
    current_document: dict[str, Any],
    fallback_entries_used: list[dict[str, Any]],
) -> dict[str, Any]:
    report = build_initial_report(fallback_entries_used)

    reference_paths = reference_document.get("paths", {})
    current_paths = current_document.get("paths", {})

    report["missing_paths"] = sorted(set(reference_paths) - set(current_paths))
    report["extra_paths"] = sorted(set(current_paths) - set(reference_paths))

    for path in sorted(set(reference_paths) & set(current_paths)):
        reference_path_item = reference_paths[path]
        current_path_item = current_paths[path]

        reference_methods = {key for key in reference_path_item if key in HTTP_METHODS}
        current_methods = {key for key in current_path_item if key in HTTP_METHODS}

        if reference_methods != current_methods:
            report["method_mismatches"].append(
                {
                    "path": path,
                    "reference_methods": sorted(reference_methods),
                    "current_methods": sorted(current_methods),
                }
            )
            continue

        for method in sorted(reference_methods):
            reference_operation = reference_path_item[method]
            current_operation = current_path_item[method]

            reference_statuses = set((reference_operation.get("responses") or {}).keys())
            current_statuses = set((current_operation.get("responses") or {}).keys())

            if reference_statuses != current_statuses:
                report["status_code_mismatches"].append(
                    {
                        "path": path,
                        "method": method,
                        "reference_statuses": sorted(reference_statuses),
                        "current_statuses": sorted(current_statuses),
                    }
                )
                continue

            normalized_reference = normalize_operation_contract(
                reference_document,
                reference_path_item,
                reference_operation,
            )
            normalized_current = normalize_operation_contract(
                current_document,
                current_path_item,
                current_operation,
            )

            if canonicalize_json(normalized_reference) != canonicalize_json(normalized_current):
                if fallback_allows_schema_mismatch(fallback_entries_used, path, method):
                    continue
                report["schema_mismatches"].append({"path": path, "method": method})

    if (
        report["missing_paths"]
        or report["method_mismatches"]
        or report["status_code_mismatches"]
        or report["schema_mismatches"]
    ):
        report["status"] = "failed"

    return report


def run_parity_check(
    edge_root: Path = EDGE_ROOT,
    docs_root: Path = PUBLIC_DOCS_ROOT,
    reference_path: Path = REFERENCE_CONTRACT_PATH,
) -> dict[str, Any]:
    require_yaml_dependency()
    current_document = load_yaml_document(docs_root / "openapi.yaml")
    reference_document = load_yaml_document(reference_path)
    manifest = load_json_document(docs_root / "service-export-manifest.json")
    fallback_entries_used = manifest.get("fallback_entries_used", [])
    if not isinstance(fallback_entries_used, list):
        raise ParityError("Expected fallback_entries_used list in service-export-manifest.json")

    report = compare_openapi_documents(
        reference_document=reference_document,
        current_document=current_document,
        fallback_entries_used=fallback_entries_used,
    )
    write_json_document(docs_root / "parity-report.json", report)
    return report


def main() -> int:
    try:
        report = run_parity_check()
    except ParityError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if report["status"] != "passed":
        print(json.dumps(report, indent=2, sort_keys=False))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
