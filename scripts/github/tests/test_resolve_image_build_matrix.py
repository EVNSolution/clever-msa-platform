import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "resolve-image-build-matrix.py"


def load_module():
    spec = importlib.util.spec_from_file_location("resolve_image_build_matrix", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ResolveImageBuildMatrixTests(unittest.TestCase):
    def test_discovers_only_development_slices_with_dockerfile(self):
        matrix = load_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "development" / "service-account-access").mkdir(parents=True)
            (root / "development" / "service-account-access" / "Dockerfile").write_text(
                "FROM scratch\n",
                encoding="utf-8",
            )
            (root / "development" / "runtime-prod-release").mkdir(parents=True)
            (root / "development" / "runtime-prod-release" / "README.md").write_text(
                "# runtime\n",
                encoding="utf-8",
            )

            slices = matrix.discover_buildable_slices(root)

        self.assertEqual(
            slices,
            [
                {
                    "slice": "service-account-access",
                    "path": "development/service-account-access",
                    "ecr_repository": "service-account-access",
                    "kind": "generic",
                }
            ],
        )

    def test_changed_path_matrix_keeps_edge_kind(self):
        matrix = load_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "development" / "edge-api-gateway").mkdir(parents=True)
            (root / "development" / "edge-api-gateway" / "Dockerfile").write_text(
                "FROM scratch\n",
                encoding="utf-8",
            )

            payload = matrix.matrix_for_changed_paths(
                root,
                ["development/edge-api-gateway/nginx.conf", "docs/README.md"],
            )

        self.assertEqual(
            json.loads(payload),
            {
                "include": [
                    {
                        "slice": "edge-api-gateway",
                        "path": "development/edge-api-gateway",
                        "ecr_repository": "edge-api-gateway",
                        "kind": "edge",
                    }
                ]
            },
        )

    def test_manual_slice_must_be_buildable(self):
        matrix = load_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "development" / "front-driver-app").mkdir(parents=True)

            with self.assertRaises(SystemExit) as context:
                matrix.matrix_for_manual_slice(root, "front-driver-app")

        self.assertEqual(context.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
