from __future__ import annotations

import json
import os
import re
import subprocess
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen


DEFAULT_GITHUB_OWNER = "EVNSolution"
DEFAULT_BUILD_WORKFLOW_FILE = "build-image.yml"
DEFAULT_IMAGE_MAP_PARAMETER = "/EvDashboardPlatformStack/runtime/images"
DEFAULT_AWS_REGION = "ap-northeast-2"
ECR_HOST_RE = re.compile(
    r"^(?P<registry_id>\d+)\.dkr\.ecr\.(?P<region>[^.]+)\.amazonaws\.com/(?P<repository>.+)$"
)


class RuntimeStateError(ValueError):
    """Raised when runtime state or image resolution cannot be proven."""


def _run_json_command(*args: str) -> dict[str, Any]:
    completed = subprocess.run(
        list(args),
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def _github_request_json(url: str) -> Any:
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise RuntimeStateError("GITHUB_TOKEN is required to resolve latest successful main images")

    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urlopen(request) as response:
            return json.load(response)
    except HTTPError as exc:
        raise RuntimeStateError(f"unable to query GitHub Actions: {exc.code}") from exc


def _parse_ecr_reference(image_reference: str) -> tuple[str, str, str]:
    if "@sha256:" in image_reference:
        repository_ref, digest = image_reference.split("@sha256:", 1)
        match = ECR_HOST_RE.match(repository_ref)
        if match is None:
            raise RuntimeStateError(f"unsupported ECR image reference: {image_reference}")
        return match.group("registry_id"), match.group("region"), f"{match.group('repository')}@sha256:{digest}"

    if image_reference.startswith("sha256:"):
        return "", DEFAULT_AWS_REGION, image_reference

    repository_ref, separator, tag = image_reference.rpartition(":")
    if not separator or "/" not in repository_ref:
        return "", DEFAULT_AWS_REGION, image_reference

    match = ECR_HOST_RE.match(repository_ref)
    if match is None:
        return "", DEFAULT_AWS_REGION, image_reference

    return match.group("registry_id"), match.group("region"), f"{match.group('repository')}:{tag}"


def normalize_image_reference_to_digest(image_reference: str) -> str:
    registry_id, region, repository_ref = _parse_ecr_reference(image_reference)
    if image_reference.startswith("sha256:") or "@sha256:" in image_reference:
        return image_reference

    repository, tag = repository_ref.rsplit(":", 1)
    payload = _run_json_command(
        "aws",
        "ecr",
        "describe-images",
        "--repository-name",
        repository,
        "--image-ids",
        f"imageTag={tag}",
    )
    details = payload.get("imageDetails", [])
    if not details:
        raise RuntimeStateError(f"unable to resolve ECR tag to digest: {image_reference}")

    detail = details[0]
    resolved_registry_id = str(detail.get("registryId") or registry_id)
    resolved_region = os.getenv("AWS_REGION") or region or DEFAULT_AWS_REGION
    digest = str(detail["imageDigest"])
    return (
        f"{resolved_registry_id}.dkr.ecr.{resolved_region}.amazonaws.com/"
        f"{repository}@{digest}"
    )


def resolve_latest_successful_main_image_digest(
    repo: str,
    workflow_file: str = DEFAULT_BUILD_WORKFLOW_FILE,
) -> str:
    payload = _github_request_json(
        f"https://api.github.com/repos/{DEFAULT_GITHUB_OWNER}/{repo}/actions/workflows/"
        f"{workflow_file}/runs?branch=main&event=push&status=completed&per_page=20"
    )
    runs = payload.get("workflow_runs", [])
    successful_run = next(
        (run for run in runs if run.get("conclusion") == "success" and run.get("head_sha")),
        None,
    )
    if successful_run is None:
        raise RuntimeStateError(f"no successful main build found for repo: {repo}")

    head_sha = str(successful_run["head_sha"])
    payload = _run_json_command(
        "aws",
        "ecr",
        "describe-images",
        "--repository-name",
        repo,
        "--image-ids",
        f"imageTag={head_sha}",
    )
    details = payload.get("imageDetails", [])
    if not details:
        raise RuntimeStateError(
            f"successful main build {head_sha} for {repo} is missing in ECR"
        )

    detail = details[0]
    registry_id = str(detail["registryId"])
    region = os.getenv("AWS_REGION") or DEFAULT_AWS_REGION
    return (
        f"{registry_id}.dkr.ecr.{region}.amazonaws.com/"
        f"{repo}@{detail['imageDigest']}"
    )


def load_runtime_image_map(
    image_map_parameter: str = DEFAULT_IMAGE_MAP_PARAMETER,
) -> dict[str, str]:
    payload = _run_json_command(
        "aws",
        "ssm",
        "get-parameter",
        "--name",
        image_map_parameter,
        "--with-decryption",
    )
    parameter = payload.get("Parameter", {})
    raw_value = parameter.get("Value")
    if not isinstance(raw_value, str):
        raise RuntimeStateError("runtime image map parameter is not a JSON string")

    value = json.loads(raw_value)
    if not isinstance(value, dict):
        raise RuntimeStateError("runtime image map parameter must decode to an object")
    return {str(key): str(image) for key, image in value.items()}


def write_runtime_image_map(
    image_map: dict[str, str],
    image_map_parameter: str = DEFAULT_IMAGE_MAP_PARAMETER,
) -> dict[str, Any]:
    serialized_value = json.dumps(image_map, separators=(",", ":"), sort_keys=True)
    command = [
        "aws",
        "ssm",
        "put-parameter",
        "--name",
        image_map_parameter,
        "--type",
        "String",
        "--overwrite",
    ]
    if len(serialized_value) > 4096:
        command.extend(["--tier", "Advanced"])
    command.extend(["--value", serialized_value])
    return _run_json_command(*command)


def resolve_current_runtime_image_digest(
    workload_id: str,
    image_map_parameter: str = DEFAULT_IMAGE_MAP_PARAMETER,
) -> str:
    image_map = load_runtime_image_map(image_map_parameter=image_map_parameter)
    image_reference = image_map.get(workload_id)
    if image_reference is None:
        raise RuntimeStateError(f"missing current runtime image for workload: {workload_id}")
    return normalize_image_reference_to_digest(image_reference)
