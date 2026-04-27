#!/usr/bin/env python3

from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
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
ALLOWLIST_PATH = PUBLIC_DOCS_ROOT / "fallback-allowlist.json"
SOURCE_REGISTRY_PATH = PUBLIC_DOCS_ROOT / "service-source-registry.json"
PUBLIC_OPENAPI_REQUIREMENTS_PATH = EDGE_ROOT / "requirements-public-openapi.txt"
HTTP_METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
PRIVATE_PATH_MARKERS = {"admin", "internal", "private"}
ALLOWLIST_VERSION = 1
SOURCE_REGISTRY_VERSION = 1
SERVICE_LOCAL_DOCS_SURFACE_PATHS = {
    "/openapi.yaml",
    "/swagger",
    "/swagger/",
    "/redoc",
    "/redoc/",
}
DEFAULT_PUBLIC_API_INFO = {
    "title": "CLEVER Public API",
    "version": "1.0.0",
    "description": (
        "Aggregated public OpenAPI served by edge-api-gateway for active CLEVER MSA "
        "service prefixes."
    ),
}


class BuildError(RuntimeError):
    pass


def require_yaml_dependency() -> None:
    if YAML_IMPORT_ERROR is None:
        return

    raise BuildError(
        "PyYAML is required for the public OpenAPI scripts. "
        f"Run them with the active `python` interpreter that has {PUBLIC_OPENAPI_REQUIREMENTS_PATH.name} installed."
    ) from YAML_IMPORT_ERROR


def load_yaml_document(path: Path) -> dict[str, Any]:
    require_yaml_dependency()
    with path.open(encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    if not isinstance(document, dict):
        raise BuildError(f"Expected YAML object at {path}, got {type(document).__name__}")
    return document


def load_json_document(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        document = json.load(handle)
    if not isinstance(document, dict):
        raise BuildError(f"Expected JSON object at {path}, got {type(document).__name__}")
    return document


def canonicalize_json_bytes(document: Any) -> bytes:
    return json.dumps(
        document,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")


def sha256_for_json_document(document: Any) -> str:
    return hashlib.sha256(canonicalize_json_bytes(document)).hexdigest()


def sha256_for_openapi_document(document: dict[str, Any]) -> str:
    return sha256_for_json_document(document)


def write_json_document(path: Path, document: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(document, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def write_yaml_document(path: Path, document: dict[str, Any]) -> None:
    require_yaml_dependency()
    path.write_text(
        yaml.safe_dump(document, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )


def describe_input_location(path: Path, edge_root: Path) -> str:
    return os.path.relpath(path, edge_root)


def repo_root_env_var_name(repo: str) -> str:
    return repo.upper().replace("-", "_") + "_REPO_ROOT"


def component_namespace(service_id: str) -> str:
    return service_id.replace("-", "_")


def namespaced_component_name(service_id: str, component_name: str) -> str:
    return f"{component_namespace(service_id)}__{component_name}"


def namespaced_operation_id(service_id: str, operation_id: str) -> str:
    return f"{component_namespace(service_id)}__{operation_id}"


def fallback_display_name(service_id: str) -> str:
    trimmed = service_id.removeprefix("service-")
    return trimmed.replace("-", " ").title()


def escape_json_pointer_token(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def service_registry_entries(registry_path: Path = SOURCE_REGISTRY_PATH) -> list[dict[str, Any]]:
    registry = load_json_document(registry_path)
    version = registry.get("version")
    if version != SOURCE_REGISTRY_VERSION:
        raise BuildError(
            f"Unsupported source registry version at {registry_path}: {version!r}"
        )
    services = registry.get("services", [])
    if not isinstance(services, list) or not services:
        raise BuildError(f"Expected non-empty services list at {registry_path}")
    return services


def build_service_tag_metadata(source: dict[str, Any]) -> dict[str, str]:
    service_id = source.get("service_id")
    if not isinstance(service_id, str) or not service_id:
        raise BuildError("service_id must be a non-empty string")

    display_name = source.get("display_name")
    if not isinstance(display_name, str) or not display_name.strip():
        display_name = fallback_display_name(service_id)

    summary = source.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        summary = f"Public APIs for {display_name}."

    gateway_prefix = source.get("gateway_prefix")
    if not isinstance(gateway_prefix, str) or not gateway_prefix.strip():
        raise BuildError(f"gateway_prefix must be a non-empty string for {service_id}")

    return {
        "name": service_id,
        "description": summary.strip(),
        "x-displayName": display_name.strip(),
        "x-gatewayPrefix": gateway_prefix.strip(),
    }


def public_api_info(registry_path: Path = SOURCE_REGISTRY_PATH) -> dict[str, str]:
    registry = load_json_document(registry_path)
    info = registry.get("public_api_info")
    if not isinstance(info, dict):
        raise BuildError(f"Expected public_api_info object at {registry_path}")

    resolved = copy.deepcopy(DEFAULT_PUBLIC_API_INFO)
    resolved.update(info)
    for key in ("title", "version", "description"):
        if not isinstance(resolved.get(key), str) or not resolved[key].strip():
            raise BuildError(f"public_api_info.{key} must be a non-empty string")
    return resolved


def get_openapi_family(version: str) -> str:
    parts = version.split(".")
    if len(parts) < 2:
        raise BuildError(f"Invalid OpenAPI version: {version}")
    return ".".join(parts[:2])


def is_private_path(path: str) -> bool:
    path_segments = [segment for segment in path.strip("/").split("/") if segment]
    return any(segment in PRIVATE_PATH_MARKERS for segment in path_segments)


def is_private_operation(path: str, operation: dict[str, Any]) -> bool:
    if is_private_path(path):
        return True

    if operation.get("x-internal") or operation.get("x-private"):
        return True

    tags = {str(tag).lower() for tag in operation.get("tags", [])}
    return bool(tags & {"internal", "private"})


def filter_public_document(document: dict[str, Any]) -> dict[str, Any]:
    filtered = copy.deepcopy(document)
    public_paths: dict[str, Any] = {}

    for path, path_item in filtered.get("paths", {}).items():
        if not isinstance(path_item, dict):
            continue

        kept_path_item = {
            key: copy.deepcopy(value)
            for key, value in path_item.items()
            if key not in HTTP_METHODS
        }

        for method, operation in path_item.items():
            if method not in HTTP_METHODS:
                continue
            if not isinstance(operation, dict):
                raise BuildError(f"Expected operation object for {method.upper()} {path}")
            if is_private_operation(path, operation):
                continue
            kept_path_item[method] = copy.deepcopy(operation)

        if any(key in HTTP_METHODS for key in kept_path_item):
            public_paths[path] = kept_path_item

    filtered["paths"] = public_paths
    return prune_components_to_reachable_refs(filtered)


def merge_component_sections(
    aggregated_components: dict[str, Any],
    incoming_components: dict[str, Any],
    service_id: str,
) -> None:
    for section_name, section_items in incoming_components.items():
        if not isinstance(section_items, dict):
            raise BuildError(
                f"Component section {section_name!r} from {service_id} must be an object"
            )

        target_section = aggregated_components.setdefault(section_name, {})
        for component_name, component_value in section_items.items():
            if component_name in target_section:
                current_hash = sha256_for_json_document(target_section[component_name])
                incoming_hash = sha256_for_json_document(component_value)
                if current_hash != incoming_hash:
                    raise BuildError(
                        f"Conflicting component {section_name}.{component_name} from {service_id}"
                    )
                continue
            target_section[component_name] = copy.deepcopy(component_value)


def merge_paths(
    aggregated_paths: dict[str, Any],
    incoming_paths: dict[str, Any],
    service_id: str,
) -> None:
    for path, path_item in incoming_paths.items():
        if not isinstance(path_item, dict):
            raise BuildError(f"Path item for {path} from {service_id} must be an object")

        target_path_item = aggregated_paths.setdefault(path, {})
        for key, value in path_item.items():
            if key in HTTP_METHODS:
                if key in target_path_item:
                    raise BuildError(
                        f"Duplicate public route definition for {key.upper()} {path} from {service_id}"
                    )
                target_path_item[key] = copy.deepcopy(value)
            elif key == "parameters":
                existing = target_path_item.setdefault("parameters", [])
                if existing and sha256_for_json_document(existing) != sha256_for_json_document(value):
                    raise BuildError(f"Conflicting path parameters for {path} from {service_id}")
                if not existing:
                    target_path_item["parameters"] = copy.deepcopy(value)
            elif key not in target_path_item:
                target_path_item[key] = copy.deepcopy(value)
            elif sha256_for_json_document(target_path_item[key]) != sha256_for_json_document(value):
                raise BuildError(f"Conflicting path metadata {key!r} for {path} from {service_id}")


def iter_local_refs(node: Any) -> list[str]:
    refs: list[str] = []

    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/"):
            refs.append(ref)
        for value in node.values():
            refs.extend(iter_local_refs(value))
    elif isinstance(node, list):
        for item in node:
            refs.extend(iter_local_refs(item))

    return refs


def iter_security_scheme_refs(node: Any, document: dict[str, Any]) -> list[str]:
    refs: list[str] = []
    security_schemes = document.get("components", {}).get("securitySchemes", {})

    if isinstance(node, dict):
        security = node.get("security")
        if isinstance(security, list):
            for requirement in security:
                if not isinstance(requirement, dict):
                    continue
                for scheme_name in requirement:
                    if scheme_name in security_schemes:
                        refs.append(f"#/components/securitySchemes/{scheme_name}")
        for value in node.values():
            refs.extend(iter_security_scheme_refs(value, document))
    elif isinstance(node, list):
        for item in node:
            refs.extend(iter_security_scheme_refs(item, document))

    return refs


def resolve_local_ref(document: dict[str, Any], ref: str) -> Any:
    current: Any = document
    for raw_part in ref[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or part not in current:
            raise BuildError(f"Unresolved $ref {ref}")
        current = current[part]
    return current


def validate_resolved_refs(document: dict[str, Any]) -> None:
    for ref in iter_local_refs(document):
        resolve_local_ref(document, ref)


def split_component_ref(ref: str) -> tuple[str, str]:
    if not ref.startswith("#/components/"):
        raise BuildError(f"Expected component ref, got {ref}")

    raw_parts = ref[2:].split("/")
    if len(raw_parts) != 3:
        raise BuildError(f"Unsupported component ref shape: {ref}")

    _, section_name, component_name = raw_parts
    return (
        section_name.replace("~1", "/").replace("~0", "~"),
        component_name.replace("~1", "/").replace("~0", "~"),
    )


def namespaced_component_ref(ref: str, service_id: str) -> str:
    section_name, component_name = split_component_ref(ref)
    return (
        "#/components/"
        f"{escape_json_pointer_token(section_name)}/"
        f"{escape_json_pointer_token(namespaced_component_name(service_id, component_name))}"
    )


def rewrite_security_requirements(
    security: list[Any],
    security_scheme_name_map: dict[str, str],
) -> list[Any]:
    rewritten: list[Any] = []
    for requirement in security:
        if not isinstance(requirement, dict):
            rewritten.append(copy.deepcopy(requirement))
            continue

        rewritten_requirement: dict[str, Any] = {}
        for scheme_name, scopes in requirement.items():
            rewritten_requirement[security_scheme_name_map.get(scheme_name, scheme_name)] = (
                copy.deepcopy(scopes)
            )
        rewritten.append(rewritten_requirement)
    return rewritten


def rewrite_node_for_service_namespace(
    node: Any,
    service_id: str,
    security_scheme_name_map: dict[str, str],
) -> Any:
    if isinstance(node, dict):
        rewritten: dict[str, Any] = {}
        for key, value in node.items():
            if key == "$ref" and isinstance(value, str) and value.startswith("#/components/"):
                rewritten[key] = namespaced_component_ref(value, service_id)
                continue
            if key == "security" and isinstance(value, list):
                rewritten[key] = rewrite_security_requirements(value, security_scheme_name_map)
                continue
            rewritten[key] = rewrite_node_for_service_namespace(
                value,
                service_id,
                security_scheme_name_map,
            )
        return rewritten

    if isinstance(node, list):
        return [
            rewrite_node_for_service_namespace(item, service_id, security_scheme_name_map)
            for item in node
        ]

    return copy.deepcopy(node)


def namespace_document_components(document: dict[str, Any], service_id: str) -> dict[str, Any]:
    components = document.get("components", {})
    security_schemes = components.get("securitySchemes", {}) if isinstance(components, dict) else {}
    security_scheme_name_map = {
        str(name): namespaced_component_name(service_id, str(name))
        for name in security_schemes
    }

    rewritten = rewrite_node_for_service_namespace(document, service_id, security_scheme_name_map)
    rewritten_components = rewritten.get("components")
    if not isinstance(rewritten_components, dict):
        return rewritten

    namespaced_components: dict[str, Any] = {}
    for section_name, section_items in rewritten_components.items():
        if not isinstance(section_items, dict):
            namespaced_components[section_name] = copy.deepcopy(section_items)
            continue

        namespaced_section = {}
        for component_name, component_value in section_items.items():
            namespaced_section[
                namespaced_component_name(service_id, str(component_name))
            ] = copy.deepcopy(component_value)
        namespaced_components[section_name] = namespaced_section

    rewritten["components"] = namespaced_components
    return rewritten


def is_service_local_docs_surface_path(path: str) -> bool:
    return path in SERVICE_LOCAL_DOCS_SURFACE_PATHS


def join_gateway_prefix(gateway_prefix: str, path: str) -> str:
    if not gateway_prefix.startswith("/") or not gateway_prefix.endswith("/"):
        raise BuildError(f"gateway_prefix must start and end with '/': {gateway_prefix}")
    if not path.startswith("/"):
        raise BuildError(f"OpenAPI path must start with '/': {path}")
    suffix = path[1:]
    return gateway_prefix if suffix == "" else f"{gateway_prefix}{suffix}"


def rewrite_service_document_for_public_surface(
    document: dict[str, Any],
    service_id: str,
    gateway_prefix: str,
    tag_metadata: dict[str, str] | None = None,
) -> dict[str, Any]:
    namespaced_document = namespace_document_components(document, service_id)
    rewritten = copy.deepcopy(namespaced_document)
    public_paths: dict[str, Any] = {}

    for path, path_item in rewritten.get("paths", {}).items():
        if not isinstance(path_item, dict) or is_service_local_docs_surface_path(path):
            continue

        public_path_item: dict[str, Any] = {}
        for key, value in path_item.items():
            if key not in HTTP_METHODS or not isinstance(value, dict):
                public_path_item[key] = copy.deepcopy(value)
                continue

            operation = copy.deepcopy(value)
            operation["tags"] = [service_id]
            operation_id = operation.get("operationId")
            if isinstance(operation_id, str) and operation_id:
                operation["operationId"] = namespaced_operation_id(service_id, operation_id)
            public_path_item[key] = operation

        public_paths[join_gateway_prefix(gateway_prefix, path)] = public_path_item

    rewritten["paths"] = public_paths
    rewritten["tags"] = [copy.deepcopy(tag_metadata or {"name": service_id})]
    rewritten["info"] = {
        "title": service_id,
        "version": str(document.get("info", {}).get("version", "1.0.0")),
    }
    return rewritten


def prune_components_to_reachable_refs(document: dict[str, Any]) -> dict[str, Any]:
    pruned = copy.deepcopy(document)
    components = pruned.get("components")
    if not isinstance(components, dict):
        return pruned

    pending_refs = list(iter_local_refs(pruned.get("paths", {})))
    pending_refs.extend(iter_security_scheme_refs(pruned.get("paths", {}), pruned))
    seen_refs: set[str] = set()
    kept_components: dict[str, dict[str, Any]] = {}

    while pending_refs:
        ref = pending_refs.pop()
        if ref in seen_refs or not ref.startswith("#/components/"):
            continue
        seen_refs.add(ref)

        section_name, component_name = split_component_ref(ref)
        section = components.get(section_name)
        if not isinstance(section, dict) or component_name not in section:
            raise BuildError(f"Unresolved $ref {ref}")

        component_value = copy.deepcopy(section[component_name])
        kept_components.setdefault(section_name, {})[component_name] = component_value
        pending_refs.extend(iter_local_refs(component_value))
        pending_refs.extend(iter_security_scheme_refs(component_value, pruned))

    if kept_components:
        pruned["components"] = kept_components
    else:
        pruned.pop("components", None)

    return pruned


def aggregate_openapi_documents(
    service_documents: list[dict[str, Any]],
    fallback_entries: list[dict[str, Any]],
) -> dict[str, Any]:
    if not service_documents:
        raise BuildError("At least one service-owned export is required")

    first_document = service_documents[0]["document"]
    target_family = get_openapi_family(str(first_document.get("openapi", "")))

    aggregated: dict[str, Any] = {
        "openapi": first_document["openapi"],
        "info": copy.deepcopy(first_document.get("info", {})),
        "paths": {},
        "components": {},
    }

    if "tags" in first_document:
        aggregated["tags"] = copy.deepcopy(first_document["tags"])

    for entry in service_documents:
        document = entry["document"]
        service_id = entry["service_id"]
        version = str(document.get("openapi", ""))
        if get_openapi_family(version) != target_family:
            raise BuildError(
                f"OpenAPI version family mismatch for {service_id}: {version} vs {first_document['openapi']}"
            )

        filtered_document = filter_public_document(document)
        merge_paths(aggregated["paths"], filtered_document.get("paths", {}), service_id)
        merge_component_sections(
            aggregated["components"],
            filtered_document.get("components", {}),
            service_id,
        )

    apply_route_inventory_fallback_entries(aggregated["paths"], fallback_entries)

    aggregated = prune_components_to_reachable_refs(aggregated)

    if not aggregated.get("components"):
        aggregated.pop("components", None)

    validate_resolved_refs(aggregated)
    return aggregated


def load_fallback_allowlist(allowlist_path: Path) -> list[dict[str, Any]]:
    allowlist = load_json_document(allowlist_path)
    version = allowlist.get("version")
    if version != ALLOWLIST_VERSION:
        raise BuildError(
            f"Unsupported fallback allowlist version at {allowlist_path}: {version!r}"
        )
    entries = allowlist.get("entries", [])
    if not isinstance(entries, list):
        raise BuildError(f"Expected list at {allowlist_path} -> entries")
    return entries


def apply_route_inventory_fallback_entries(
    aggregated_paths: dict[str, Any],
    fallback_entries: list[dict[str, Any]],
) -> None:
    for entry in fallback_entries:
        fallback_mode = entry.get("fallback_mode", "route_inventory")
        if fallback_mode != "route_inventory":
            raise BuildError(f"Unsupported fallback mode: {fallback_mode}")

        path = entry.get("path")
        method = str(entry.get("method", "")).lower()
        operation = entry.get("operation")
        service_id = str(entry.get("service_id", "fallback"))

        if not path or method not in HTTP_METHODS or not isinstance(operation, dict):
            raise BuildError(
                "Fallback route inventory entries require service_id, path, method, and operation"
            )
        if is_private_operation(path, operation):
            raise BuildError(f"Fallback entry leaks private route: {method.upper()} {path}")

        merge_paths(aggregated_paths, {path: {method: operation}}, service_id)


def build_revision_record(
    edge_commit_sha: str,
    openapi_sha256: str,
    service_export_manifest_sha: str,
) -> dict[str, str]:
    return {
        "edge_commit_sha": edge_commit_sha,
        "openapi_sha256": openapi_sha256,
        "service_export_manifest_sha": service_export_manifest_sha,
    }


def resolve_source_repo_root(edge_root: Path, source: dict[str, Any]) -> Path:
    repo = source.get("repo")
    if not isinstance(repo, str) or not repo:
        raise BuildError(f"Missing repo for source: {source!r}")

    env_var_name = repo_root_env_var_name(repo)
    explicit_root = os.environ.get(env_var_name)
    if explicit_root:
        candidate_root = Path(explicit_root).expanduser()
    else:
        candidate_root = edge_root.parent / repo

    repo_root = candidate_root.resolve()
    if (repo_root / "manage.py").is_file():
        return repo_root

    if explicit_root:
        raise BuildError(
            f"{repo} repo override from {env_var_name} must point to a checkout containing "
            f"manage.py, but no manage.py was found at {repo_root}"
        )

    raise BuildError(f"{repo} repo is required for the public OpenAPI build")


def resolve_repo_commit_sha(repo_root: Path) -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise BuildError(f"Unable to resolve repo commit sha from git at {repo_root}")
    return result.stdout.strip()


def export_environment_overrides() -> dict[str, str]:
    return {
        "DJANGO_SECRET_KEY": "edge-public-openapi-build-secret",
        "JWT_SECRET_KEY": "edge-public-openapi-build-jwt-secret",
        "POSTGRES_DB": "edge_public_openapi",
        "POSTGRES_USER": "edge_public_openapi",
        "POSTGRES_PASSWORD": "edge_public_openapi",
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "PERSONNEL_DOCUMENT_TEST_MODE": "1",
    }


def default_service_sources(edge_root: Path) -> list[dict[str, Any]]:
    del edge_root
    return copy.deepcopy(service_registry_entries())


def export_service_document(
    source: dict[str, Any],
    edge_root: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    service_id = source["service_id"]
    gateway_prefix = source.get("gateway_prefix")
    if not isinstance(gateway_prefix, str) or not gateway_prefix:
        raise BuildError(f"Missing gateway_prefix for {service_id}")

    if "export_path" in source:
        export_path = Path(source["export_path"])
        document = load_yaml_document(export_path)
        metadata = {
            "service_id": service_id,
            "gateway_prefix": gateway_prefix,
            "source": "service_export",
            "export_kind": "yaml_file",
            "input_path": describe_input_location(export_path, edge_root),
            "sha256": sha256_for_openapi_document(document),
            "path_count": len(document.get("paths", {})),
            "component_counts": {
                section_name: len(section_items)
                for section_name, section_items in document.get("components", {}).items()
                if isinstance(section_items, dict)
            },
        }
        return document, metadata

    export_kind = source.get("export_kind")
    if export_kind != "django_spectacular":
        raise BuildError(f"Unsupported export kind for {service_id}: {export_kind}")

    repo_root = resolve_source_repo_root(edge_root, source)
    manage_py_path = repo_root / "manage.py"
    if not manage_py_path.is_file():
        raise BuildError(f"Expected manage.py for {service_id} at {manage_py_path}")
    with tempfile.TemporaryDirectory(prefix=f"{service_id}-openapi-") as temp_dir:
        export_path = Path(temp_dir) / "openapi.yaml"
        result = subprocess.run(
            [sys.executable, str(manage_py_path), "spectacular", "--file", str(export_path)],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=False,
            env={**os.environ.copy(), **export_environment_overrides()},
        )
        if result.returncode != 0:
            raise BuildError(
                "Failed to export "
                f"{service_id} OpenAPI schema via {manage_py_path}. "
                "Run the builder with the active `python` interpreter that has "
                f"{PUBLIC_OPENAPI_REQUIREMENTS_PATH.name} plus the target service export dependencies installed.\n"
                f"{result.stdout}\n{result.stderr}".strip()
            )

        document = load_yaml_document(export_path)

    metadata = {
        "service_id": service_id,
        "repo": source["repo"],
        "gateway_prefix": gateway_prefix,
        "source": "service_export",
        "export_kind": export_kind,
        "repo_root": describe_input_location(repo_root, edge_root),
        "repo_commit_sha": resolve_repo_commit_sha(repo_root),
        "sha256": sha256_for_openapi_document(document),
        "path_count": len(document.get("paths", {})),
        "component_counts": {
            section_name: len(section_items)
            for section_name, section_items in document.get("components", {}).items()
            if isinstance(section_items, dict)
        },
    }
    return document, metadata


def resolve_edge_commit_sha(edge_root: Path, explicit_value: str | None = None) -> str:
    if explicit_value:
        return explicit_value

    env_value = os.environ.get("EDGE_COMMIT_SHA")
    if env_value:
        return env_value

    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=edge_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise BuildError("Unable to resolve edge commit sha from git")
    return result.stdout.strip()


def build_public_openapi(
    edge_root: Path = EDGE_ROOT,
    output_root: Path = PUBLIC_DOCS_ROOT,
    allowlist_path: Path | None = None,
    service_sources: list[dict[str, Any]] | None = None,
    edge_commit_sha: str | None = None,
) -> dict[str, Any]:
    require_yaml_dependency()
    output_root.mkdir(parents=True, exist_ok=True)
    resolved_allowlist_path = allowlist_path or (output_root / "fallback-allowlist.json")
    sources = service_sources or default_service_sources(edge_root)
    resolved_public_api_info = (
        public_api_info()
        if service_sources is None
        else copy.deepcopy(DEFAULT_PUBLIC_API_INFO)
    )

    fallback_entries = load_fallback_allowlist(resolved_allowlist_path)
    exported_documents: list[dict[str, Any]] = []
    service_manifest_entries: list[dict[str, Any]] = []

    for source in sources:
        tag_metadata = build_service_tag_metadata(source)
        document, manifest_entry = export_service_document(source, edge_root=edge_root)
        public_document = rewrite_service_document_for_public_surface(
            document=document,
            service_id=source["service_id"],
            gateway_prefix=source["gateway_prefix"],
            tag_metadata=tag_metadata,
        )
        manifest_entry["public_path_count"] = len(public_document.get("paths", {}))
        exported_documents.append({"service_id": source["service_id"], "document": public_document})
        service_manifest_entries.append(manifest_entry)

    openapi_document = aggregate_openapi_documents(exported_documents, fallback_entries)
    openapi_document["info"] = resolved_public_api_info
    openapi_document["tags"] = [
        build_service_tag_metadata(source)
        for source in sources
    ]
    manifest = {
        "version": 1,
        "services": service_manifest_entries,
        "fallback_entries_used": copy.deepcopy(fallback_entries),
    }

    revision = build_revision_record(
        edge_commit_sha=resolve_edge_commit_sha(edge_root, explicit_value=edge_commit_sha),
        openapi_sha256=sha256_for_openapi_document(openapi_document),
        service_export_manifest_sha=sha256_for_json_document(manifest),
    )

    write_yaml_document(output_root / "openapi.yaml", openapi_document)
    write_json_document(output_root / "service-export-manifest.json", manifest)
    write_json_document(output_root / "revision.json", revision)

    return {
        "openapi": openapi_document,
        "manifest": manifest,
        "revision": revision,
    }


def main() -> int:
    try:
        build_public_openapi()
    except BuildError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
