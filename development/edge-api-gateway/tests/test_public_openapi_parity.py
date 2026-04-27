import json
import importlib.util
from pathlib import Path
import tempfile
import unittest
import uuid
import yaml


EDGE_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DOCS_ROOT = EDGE_ROOT / "public-api-docs"
FIXTURES_ROOT = Path(__file__).resolve().parent / "fixtures"
PARITY_SCRIPT_PATH = EDGE_ROOT / "scripts" / "check_public_openapi_parity.py"
BUILD_SCRIPT_PATH = EDGE_ROOT / "scripts" / "build_public_openapi.py"


def load_parity_module():
    spec = importlib.util.spec_from_file_location(
        f"check_public_openapi_parity_{uuid.uuid4().hex}",
        PARITY_SCRIPT_PATH,
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_build_module():
    spec = importlib.util.spec_from_file_location(
        f"build_public_openapi_{uuid.uuid4().hex}",
        BUILD_SCRIPT_PATH,
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PublicOpenApiParityTests(unittest.TestCase):
    def test_pre_cutover_public_openapi_baseline_is_committed(self):
        baseline_path = FIXTURES_ROOT / "pre-cutover-public-openapi.yaml"
        self.assertTrue(baseline_path.is_file())
        self.assertGreater(baseline_path.stat().st_size, 0)

    def test_parity_report_is_generated_in_temp_docs_root(self):
        build = load_build_module()
        parity = load_parity_module()
        export_path = FIXTURES_ROOT / "pre-cutover-public-openapi.yaml"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            docs_root = temp_root / "public-api-docs"
            docs_root.mkdir()
            (docs_root / "fallback-allowlist.json").write_text(
                json.dumps({"version": 1, "entries": []}),
                encoding="utf-8",
            )
            with export_path.open() as handle:
                reference_document = yaml.safe_load(handle)
            reference_document["paths"] = {
                f"/api/auth{path}": value
                for path, value in reference_document["paths"].items()
            }
            reference_path = temp_root / "prefixed-reference.yaml"
            reference_path.write_text(yaml.safe_dump(reference_document, sort_keys=False), encoding="utf-8")

            build.build_public_openapi(
                edge_root=temp_root,
                output_root=docs_root,
                service_sources=[
                    {
                        "service_id": "service-account-access",
                        "gateway_prefix": "/api/auth/",
                        "export_path": export_path,
                    }
                ],
                edge_commit_sha="edge-sha",
            )
            parity.run_parity_check(
                edge_root=temp_root,
                docs_root=docs_root,
                reference_path=reference_path,
            )

            parity_report_path = docs_root / "parity-report.json"
            self.assertTrue(parity_report_path.is_file())

            with parity_report_path.open() as handle:
                json.load(handle)

    def test_parity_uses_pre_cutover_reference_fixture(self):
        parity = load_parity_module()

        self.assertEqual(
            parity.REFERENCE_CONTRACT_PATH,
            EDGE_ROOT / "tests" / "fixtures" / "pre-cutover-public-openapi.yaml",
        )

    def test_compare_against_reference_reports_missing_path(self):
        parity = load_parity_module()

        with (FIXTURES_ROOT / "pre-cutover-public-openapi.yaml").open() as handle:
            reference = yaml.safe_load(handle)

        reduced_paths = dict(reference["paths"])
        reduced_paths.pop(next(iter(reduced_paths)))
        current = dict(reference)
        current["paths"] = reduced_paths

        report = parity.compare_openapi_documents(
            reference_document=reference,
            current_document=current,
            fallback_entries_used=[],
        )

        self.assertEqual(report["status"], "failed")
        self.assertEqual(len(report["missing_paths"]), 1)
        self.assertEqual(report["extra_paths"], [])
        self.assertEqual(report["method_mismatches"], [])
        self.assertEqual(report["status_code_mismatches"], [])
        self.assertEqual(report["schema_mismatches"], [])
        self.assertEqual(report["fallback_entries_used"], [])

    def test_compare_against_reference_allows_additional_paths_for_aggregate_growth(self):
        parity = load_parity_module()
        reference = {
            "openapi": "3.0.3",
            "paths": {
                "/api/auth/health/": {
                    "get": {
                        "responses": {
                            "200": {"description": "ok"}
                        }
                    }
                }
            },
        }
        current = {
            "openapi": "3.0.3",
            "paths": {
                "/api/auth/health/": {
                    "get": {
                        "responses": {
                            "200": {"description": "ok"}
                        }
                    }
                },
                "/api/org/companies/": {
                    "get": {
                        "responses": {
                            "200": {"description": "ok"}
                        }
                    }
                },
            },
        }

        report = parity.compare_openapi_documents(
            reference_document=reference,
            current_document=current,
            fallback_entries_used=[],
        )

        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["extra_paths"], ["/api/org/companies/"])

    def test_compare_against_reference_reports_success_for_fixture_match(self):
        parity = load_parity_module()

        with (FIXTURES_ROOT / "pre-cutover-public-openapi.yaml").open() as handle:
            reference = yaml.safe_load(handle)

        report = parity.compare_openapi_documents(
            reference_document=reference,
            current_document=reference,
            fallback_entries_used=[],
        )

        self.assertEqual(
            report,
            {
                "status": "passed",
                "missing_paths": [],
                "extra_paths": [],
                "method_mismatches": [],
                "status_code_mismatches": [],
                "schema_mismatches": [],
                "fallback_entries_used": [],
            },
        )

    def test_compare_ignores_examples_and_servers_in_schema_diff(self):
        parity = load_parity_module()
        reference = {
            "openapi": "3.0.3",
            "paths": {
                "/health/": {
                    "get": {
                        "summary": "baseline summary",
                        "description": "baseline description",
                        "operationId": "baselineHealth",
                        "tags": ["baseline"],
                        "servers": [{"url": "https://baseline.example.com"}],
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "object"},
                                        "examples": {"baseline": {"value": {"ok": True}}},
                                    }
                                },
                            }
                        },
                    }
                }
            },
        }
        current = {
            "openapi": "3.0.3",
            "paths": {
                "/health/": {
                    "get": {
                        "summary": "current summary",
                        "description": "current description",
                        "operationId": "currentHealth",
                        "tags": ["current"],
                        "servers": [{"url": "https://current.example.com"}],
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "object"},
                                        "examples": {"current": {"value": {"ok": False}}},
                                    }
                                },
                            }
                        },
                    }
                }
            },
        }

        report = parity.compare_openapi_documents(
            reference_document=reference,
            current_document=current,
            fallback_entries_used=[],
        )

        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["schema_mismatches"], [])

    def test_allowlisted_fallback_entry_skips_schema_mismatch_only_for_that_operation(self):
        parity = load_parity_module()
        reference = {
            "openapi": "3.0.3",
            "paths": {
                "/legacy/": {
                    "get": {
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "object", "properties": {"name": {"type": "string"}}}
                                    }
                                },
                            }
                        }
                    }
                }
            },
        }
        current = {
            "openapi": "3.0.3",
            "paths": {
                "/legacy/": {
                    "get": {
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {"name": {"type": "integer"}},
                                        }
                                    }
                                },
                            }
                        }
                    }
                }
            },
        }

        report = parity.compare_openapi_documents(
            reference_document=reference,
            current_document=current,
            fallback_entries_used=[
                {
                    "service_id": "legacy-service",
                    "fallback_mode": "route_inventory",
                    "path": "/legacy/",
                    "method": "get",
                }
            ],
        )

        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["schema_mismatches"], [])
        self.assertEqual(len(report["fallback_entries_used"]), 1)

    def test_allowlisted_fallback_entry_still_enforces_status_code_parity(self):
        parity = load_parity_module()
        reference = {
            "openapi": "3.0.3",
            "paths": {
                "/legacy/": {
                    "get": {
                        "responses": {
                            "200": {
                                "description": "ok",
                            }
                        }
                    }
                }
            },
        }
        current = {
            "openapi": "3.0.3",
            "paths": {
                "/legacy/": {
                    "get": {
                        "responses": {
                            "204": {
                                "description": "no content",
                            }
                        }
                    }
                }
            },
        }

        report = parity.compare_openapi_documents(
            reference_document=reference,
            current_document=current,
            fallback_entries_used=[
                {
                    "service_id": "legacy-service",
                    "fallback_mode": "route_inventory",
                    "path": "/legacy/",
                    "method": "get",
                }
            ],
        )

        self.assertEqual(report["status"], "failed")
        self.assertEqual(
            report["status_code_mismatches"],
            [
                {
                    "path": "/legacy/",
                    "method": "get",
                    "reference_statuses": ["200"],
                    "current_statuses": ["204"],
                }
            ],
        )

    def test_parity_report_file_uses_required_shape(self):
        parity = load_parity_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            docs_root = temp_root / "public-api-docs"
            docs_root.mkdir()

            with (FIXTURES_ROOT / "pre-cutover-public-openapi.yaml").open() as handle:
                reference = yaml.safe_load(handle)

            (docs_root / "openapi.yaml").write_text(
                yaml.safe_dump(reference, sort_keys=False),
                encoding="utf-8",
            )
            (docs_root / "service-export-manifest.json").write_text(
                json.dumps(
                    {
                        "version": 1,
                        "services": [],
                        "fallback_entries_used": [
                            {"service_id": "legacy-service", "path": "/legacy/", "method": "get"}
                        ],
                    }
                ),
                encoding="utf-8",
            )

            report = parity.run_parity_check(
                edge_root=temp_root,
                docs_root=docs_root,
                reference_path=FIXTURES_ROOT / "pre-cutover-public-openapi.yaml",
            )

            written = json.loads((docs_root / "parity-report.json").read_text(encoding="utf-8"))

        self.assertEqual(report, written)
        self.assertEqual(
            set(written),
            {
                "status",
                "missing_paths",
                "extra_paths",
                "method_mismatches",
                "status_code_mismatches",
                "schema_mismatches",
                "fallback_entries_used",
            },
        )
        self.assertEqual(
            written["fallback_entries_used"],
            [{"service_id": "legacy-service", "path": "/legacy/", "method": "get"}],
        )


if __name__ == "__main__":
    unittest.main()
