from __future__ import annotations

import argparse
import sys
from pathlib import Path


ROUTE_GROUP_ORDER = [
    "people-and-assets",
    "dispatch-inputs",
    "dispatch-read-models",
    "settlement",
    "support-surface",
    "terminal-and-telemetry",
]

ROUTE_GROUP_FILES = {
    "people-and-assets": "nginx.routes.people-and-assets.conf",
    "dispatch-inputs": "nginx.routes.dispatch-inputs.conf",
    "dispatch-read-models": "nginx.routes.dispatch-read-models.conf",
    "settlement": "nginx.routes.settlement.conf",
    "support-surface": "nginx.routes.support-surface.conf",
    "terminal-and-telemetry": "nginx.routes.terminal-and-telemetry.conf",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", required=True, choices=["bootstrap-proof", "partial", "full"])
    parser.add_argument("--route-groups", default="")
    parser.add_argument("--template-dir", default=str(Path(__file__).resolve().parent))
    return parser.parse_args()


def render_partial(template_dir: Path, route_groups: str) -> str:
    requested = [value.strip() for value in route_groups.split(",") if value.strip()]
    if not requested:
        raise ValueError("partial profile requires at least one route group")

    unknown = sorted(set(requested) - set(ROUTE_GROUP_FILES))
    if unknown:
        raise ValueError(f"unsupported route groups: {', '.join(unknown)}")

    ordered_groups = [group for group in ROUTE_GROUP_ORDER if group in requested]
    chunks = [
        (template_dir / "nginx.partial.base.start.conf").read_text(),
        *[(template_dir / ROUTE_GROUP_FILES[group]).read_text() for group in ordered_groups],
        (template_dir / "nginx.partial.base.end.conf").read_text(),
    ]
    return "\n".join(chunk.rstrip("\n") for chunk in chunks if chunk) + "\n"


def main() -> int:
    args = parse_args()
    template_dir = Path(args.template_dir)

    if args.profile == "bootstrap-proof":
        sys.stdout.write((template_dir / "nginx.bootstrap-proof.conf").read_text())
        return 0

    if args.profile == "full":
        sys.stdout.write((template_dir / "nginx.full.conf").read_text())
        return 0

    sys.stdout.write(render_partial(template_dir, args.route_groups))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
