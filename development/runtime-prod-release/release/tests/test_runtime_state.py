from __future__ import annotations

import json
import subprocess

import pytest

from release.runtime_state import write_runtime_image_map


def test_write_runtime_image_map_uses_standard_tier_for_small_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen_args: list[str] = []

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        seen_args.extend(args)
        return subprocess.CompletedProcess(
            args=args,
            returncode=0,
            stdout=json.dumps({"Version": 1}),
            stderr="",
        )

    monkeypatch.setattr("release.runtime_state.subprocess.run", fake_run)

    result = write_runtime_image_map({"front-web-console": "sha256:demo"})

    assert result == {"Version": 1}
    assert "--tier" not in seen_args


def test_write_runtime_image_map_uses_advanced_tier_for_large_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen_args: list[str] = []

    def fake_run(
        args: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        seen_args.extend(args)
        return subprocess.CompletedProcess(
            args=args,
            returncode=0,
            stdout=json.dumps({"Version": 5, "Tier": "Advanced"}),
            stderr="",
        )

    monkeypatch.setattr("release.runtime_state.subprocess.run", fake_run)

    large_image_map = {
        f"service-{index:02d}": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/"
        f"service-{index:02d}@sha256:{'a' * 64}"
        for index in range(40)
    }

    result = write_runtime_image_map(large_image_map)

    assert result == {"Version": 5, "Tier": "Advanced"}
    assert "--tier" in seen_args
    tier_index = seen_args.index("--tier")
    assert seen_args[tier_index + 1] == "Advanced"
