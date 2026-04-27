import json
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest
import uuid
from unittest import mock


EDGE_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DOCS_ROOT = EDGE_ROOT / "public-api-docs"
FIXTURES_ROOT = Path(__file__).resolve().parent / "fixtures"
BUILD_SCRIPT_PATH = EDGE_ROOT / "scripts" / "build_public_openapi.py"
PREPARE_SCRIPT_PATH = EDGE_ROOT / "scripts" / "prepare_public_openapi_sources.py"
REQUIREMENTS_PATH = EDGE_ROOT / "requirements-public-openapi.txt"
SOURCE_REGISTRY_PATH = EDGE_ROOT / "public-api-docs" / "service-source-registry.json"


def load_build_module():
    spec = importlib.util.spec_from_file_location(
        f"build_public_openapi_{uuid.uuid4().hex}",
        BUILD_SCRIPT_PATH,
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_prepare_module():
    scripts_root = str(BUILD_SCRIPT_PATH.parent)
    sys.path.insert(0, scripts_root)
    try:
        spec = importlib.util.spec_from_file_location(
            f"prepare_public_openapi_sources_{uuid.uuid4().hex}",
            PREPARE_SCRIPT_PATH,
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.remove(scripts_root)


class PublicOpenApiBuildTests(unittest.TestCase):
    def test_committed_swagger_ui_shell_is_service_filterable_and_collapsed_by_default(self):
        swagger_html = (PUBLIC_DOCS_ROOT / "swagger" / "index.html").read_text(encoding="utf-8")

        for snippet in (
            'id="swagger-ui"',
            'id="service-filter"',
            'id="service-summary"',
            "js-yaml",
            'docExpansion: "none"',
            "renderServiceFilter",
            "filterSpecByTag",
            "history.replaceState",
            'new URLSearchParams(window.location.search)',
        ):
            with self.subTest(snippet=snippet):
                self.assertIn(snippet, swagger_html)

    def test_generated_public_docs_artifacts_are_gitignored(self):
        gitignore_contents = (EDGE_ROOT / ".gitignore").read_text(encoding="utf-8")

        for relative_path in (
            "public-api-docs/openapi.yaml",
            "public-api-docs/revision.json",
            "public-api-docs/service-export-manifest.json",
            "public-api-docs/parity-report.json",
        ):
            with self.subTest(relative_path=relative_path):
                self.assertIn(relative_path, gitignore_contents)

    def test_committed_public_docs_inputs_exist(self):
        self.assertTrue((PUBLIC_DOCS_ROOT / "fallback-allowlist.json").is_file())
        self.assertTrue((FIXTURES_ROOT / "pre-cutover-public-openapi.yaml").is_file())
        self.assertTrue((PUBLIC_DOCS_ROOT / "swagger" / "index.html").is_file())
        self.assertTrue((PUBLIC_DOCS_ROOT / "redoc" / "index.html").is_file())

    def test_public_openapi_script_requirements_are_declared(self):
        self.assertTrue(REQUIREMENTS_PATH.is_file())
        requirements = REQUIREMENTS_PATH.read_text(encoding="utf-8")
        self.assertIn("PyYAML", requirements)

    def test_public_openapi_source_registry_is_committed(self):
        self.assertTrue(SOURCE_REGISTRY_PATH.is_file())

        with SOURCE_REGISTRY_PATH.open() as handle:
            registry = json.load(handle)

        self.assertEqual(registry["version"], 1)
        self.assertEqual(registry["public_api_info"]["title"], "CLEVER Public API")
        service_ids = [entry["service_id"] for entry in registry["services"]]
        self.assertGreaterEqual(len(service_ids), 20)
        self.assertIn("service-account-access", service_ids)
        self.assertIn("service-organization-registry", service_ids)
        self.assertIn("service-telemetry-dead-letter", service_ids)
        for entry in registry["services"]:
            with self.subTest(service_id=entry["service_id"]):
                self.assertIsInstance(entry.get("display_name"), str)
                self.assertTrue(entry["display_name"].strip())
                self.assertIsInstance(entry.get("summary"), str)
                self.assertTrue(entry["summary"].strip())

    def test_fallback_allowlist_is_json(self):
        allowlist_path = PUBLIC_DOCS_ROOT / "fallback-allowlist.json"
        self.assertTrue(allowlist_path.is_file())

        with allowlist_path.open() as handle:
            json.load(handle)

    def test_generated_public_docs_artifacts_exist_after_temp_build(self):
        build = load_build_module()
        export_path = FIXTURES_ROOT / "pre-cutover-public-openapi.yaml"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            docs_root = temp_root / "public-api-docs"
            docs_root.mkdir()
            (docs_root / "fallback-allowlist.json").write_text(
                json.dumps({"version": 1, "entries": []}),
                encoding="utf-8",
            )

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

            for relative_path in (
                "openapi.yaml",
                "revision.json",
                "service-export-manifest.json",
            ):
                with self.subTest(relative_path=relative_path):
                    self.assertTrue((docs_root / relative_path).is_file())

    def test_default_service_sources_uses_explicit_repo_root_override(self):
        build = load_build_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            sources = build.default_service_sources(temp_root)

        self.assertGreaterEqual(len(sources), 20)
        account_access = next(
            source for source in sources if source["service_id"] == "service-account-access"
        )
        self.assertEqual(account_access["repo"], "service-account-access")
        self.assertEqual(account_access["gateway_prefix"], "/api/auth/")
        self.assertEqual(account_access["export_kind"], "django_spectacular")

    def test_default_service_sources_keeps_local_sibling_repo_lookup(self):
        build = load_build_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir) / "edge-api-gateway"
            sibling_root = temp_root.parent / "service-account-access"
            sibling_root.mkdir(parents=True)
            temp_root.mkdir()
            (sibling_root / "manage.py").write_text("# stub", encoding="utf-8")

            with mock.patch.dict(os.environ, {}, clear=True):
                resolved_root = build.resolve_source_repo_root(
                    temp_root,
                    {
                        "service_id": "service-account-access",
                        "repo": "service-account-access",
                    },
                )

        self.assertEqual(resolved_root, sibling_root.resolve())

    def test_prepare_sources_uses_monorepo_development_slice_before_clone(self):
        prepare = load_prepare_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            workspace_root = Path(temp_dir)
            service_root = workspace_root / "development" / "service-account-access"
            service_root.mkdir(parents=True)
            (service_root / "manage.py").write_text("# stub", encoding="utf-8")

            resolved_root = prepare.ensure_repo_checkout(
                "service-account-access",
                workspace_root,
                token=None,
            )

        self.assertEqual(resolved_root, service_root.resolve())

    def test_service_document_is_rewritten_to_gateway_prefix_and_owner_tag(self):
        build = load_build_module()
        document = {
            "openapi": "3.0.3",
            "info": {
                "title": "Service Account Access",
                "version": "1.0.0",
            },
            "paths": {
                "/health/": {
                    "get": {
                        "operationId": "health_retrieve",
                        "tags": ["health"],
                        "responses": {"200": {"description": "ok"}},
                    }
                },
                "/openapi.yaml": {
                    "get": {
                        "operationId": "docs",
                        "responses": {"200": {"description": "ok"}},
                    }
                },
            },
            "components": {
                "schemas": {
                    "Health": {
                        "type": "object",
                        "properties": {
                            "status": {"type": "string"},
                        },
                    }
                }
            },
        }

        rewritten = build.rewrite_service_document_for_public_surface(
            document=document,
            service_id="service-account-access",
            gateway_prefix="/api/auth/",
            tag_metadata={
                "name": "service-account-access",
                "description": "Identity, login, and account workspace access APIs.",
                "x-displayName": "Account Access",
                "x-gatewayPrefix": "/api/auth/",
            },
        )

        self.assertEqual(set(rewritten["paths"]), {"/api/auth/health/"})
        operation = rewritten["paths"]["/api/auth/health/"]["get"]
        self.assertEqual(operation["tags"], ["service-account-access"])
        self.assertEqual(
            operation["operationId"],
            "service_account_access__health_retrieve",
        )
        self.assertEqual(
            set(rewritten["components"]["schemas"]),
            {"service_account_access__Health"},
        )
        self.assertEqual(
            rewritten["tags"],
            [
                {
                    "name": "service-account-access",
                    "description": "Identity, login, and account workspace access APIs.",
                    "x-displayName": "Account Access",
                    "x-gatewayPrefix": "/api/auth/",
                }
            ],
        )

    def test_build_uses_registry_tag_metadata_for_top_level_tags(self):
        build = load_build_module()
        export_path = FIXTURES_ROOT / "pre-cutover-public-openapi.yaml"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            docs_root = temp_root / "public-api-docs"
            docs_root.mkdir()
            (docs_root / "fallback-allowlist.json").write_text(
                json.dumps({"version": 1, "entries": []}),
                encoding="utf-8",
            )

            result = build.build_public_openapi(
                edge_root=temp_root,
                output_root=docs_root,
                service_sources=[
                    {
                        "service_id": "service-account-access",
                        "repo": "service-account-access",
                        "gateway_prefix": "/api/auth/",
                        "display_name": "Account Access",
                        "summary": "Identity, login, and account workspace access APIs.",
                        "export_path": export_path,
                    }
                ],
                edge_commit_sha="edge-sha",
            )

        self.assertEqual(
            result["openapi"]["tags"],
            [
                {
                    "name": "service-account-access",
                    "description": "Identity, login, and account workspace access APIs.",
                    "x-displayName": "Account Access",
                    "x-gatewayPrefix": "/api/auth/",
                }
            ],
        )

    def test_component_name_conflicts_are_avoided_by_service_namespace(self):
        build = load_build_module()
        document_a = build.rewrite_service_document_for_public_surface(
            document={
                "openapi": "3.0.3",
                "info": {"title": "A", "version": "1.0.0"},
                "paths": {
                    "/items/": {
                        "get": {
                            "responses": {
                                "200": {
                                    "description": "ok",
                                    "content": {
                                        "application/json": {
                                            "schema": {"$ref": "#/components/schemas/StatusMessage"}
                                        }
                                    },
                                }
                            }
                        }
                    }
                },
                "components": {
                    "schemas": {
                        "StatusMessage": {
                            "type": "object",
                            "properties": {"message": {"type": "string"}},
                        }
                    }
                },
            },
            service_id="service-a",
            gateway_prefix="/api/a/",
        )
        document_b = build.rewrite_service_document_for_public_surface(
            document={
                "openapi": "3.0.3",
                "info": {"title": "B", "version": "1.0.0"},
                "paths": {
                    "/items/": {
                        "get": {
                            "responses": {
                                "200": {
                                    "description": "ok",
                                    "content": {
                                        "application/json": {
                                            "schema": {"$ref": "#/components/schemas/StatusMessage"}
                                        }
                                    },
                                }
                            }
                        }
                    }
                },
                "components": {
                    "schemas": {
                        "StatusMessage": {
                            "type": "object",
                            "properties": {"code": {"type": "integer"}},
                        }
                    }
                },
            },
            service_id="service-b",
            gateway_prefix="/api/b/",
        )

        aggregated = build.aggregate_openapi_documents(
            [
                {"service_id": "service-a", "document": document_a},
                {"service_id": "service-b", "document": document_b},
            ],
            fallback_entries=[],
        )

        self.assertEqual(
            set(aggregated["components"]["schemas"]),
            {"service_a__StatusMessage", "service_b__StatusMessage"},
        )

    def test_duplicate_path_and_method_fails(self):
        build = load_build_module()

        duplicate_documents = [
            {
                "service_id": "service-a",
                "document": {
                    "openapi": "3.0.3",
                    "paths": {"/health/": {"get": {"responses": {"200": {"description": "ok"}}}}},
                },
            },
            {
                "service_id": "service-b",
                "document": {
                    "openapi": "3.0.3",
                    "paths": {"/health/": {"get": {"responses": {"200": {"description": "ok"}}}}},
                },
            },
        ]

        with self.assertRaises(build.BuildError):
            build.aggregate_openapi_documents(duplicate_documents, fallback_entries=[])

    def test_conflicting_component_names_fail(self):
        build = load_build_module()

        component_documents = [
            {
                "service_id": "service-a",
                "document": {
                    "openapi": "3.0.3",
                    "paths": {
                        "/service-a/": {
                            "get": {
                                "responses": {
                                    "200": {
                                        "description": "ok",
                                        "content": {
                                            "application/json": {
                                                "schema": {"$ref": "#/components/schemas/SharedThing"}
                                            }
                                        },
                                    }
                                }
                            }
                        }
                    },
                    "components": {
                        "schemas": {
                            "SharedThing": {
                                "type": "object",
                                "properties": {"name": {"type": "string"}},
                            }
                        }
                    },
                },
            },
            {
                "service_id": "service-b",
                "document": {
                    "openapi": "3.0.3",
                    "paths": {
                        "/service-b/": {
                            "get": {
                                "responses": {
                                    "200": {
                                        "description": "ok",
                                        "content": {
                                            "application/json": {
                                                "schema": {"$ref": "#/components/schemas/SharedThing"}
                                            }
                                        },
                                    }
                                }
                            }
                        }
                    },
                    "components": {
                        "schemas": {
                            "SharedThing": {
                                "type": "object",
                                "properties": {"count": {"type": "integer"}},
                            }
                        }
                    },
                },
            },
        ]

        with self.assertRaises(build.BuildError):
            build.aggregate_openapi_documents(component_documents, fallback_entries=[])

    def test_private_and_internal_endpoints_are_excluded(self):
        build = load_build_module()
        document = {
            "openapi": "3.0.3",
            "paths": {
                "/health/": {"get": {"responses": {"200": {"description": "ok"}}}},
                "/internal/stats/": {"get": {"responses": {"200": {"description": "ok"}}}},
                "/private/audit/": {"get": {"responses": {"200": {"description": "ok"}}}},
                "/visible-but-marked/": {
                    "get": {
                        "x-internal": True,
                        "responses": {"200": {"description": "ok"}},
                    }
                },
            },
        }

        filtered = build.filter_public_document(document)

        self.assertEqual(set(filtered["paths"]), {"/health/"})

    def test_private_only_schemas_are_pruned_from_public_components(self):
        build = load_build_module()
        document = {
            "openapi": "3.0.3",
            "info": {"title": "test", "version": "1.0.0"},
            "paths": {
                "/public/": {
                    "get": {
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/PublicEnvelope"}
                                    }
                                },
                            }
                        }
                    }
                },
                "/internal/private/": {
                    "get": {
                        "responses": {
                            "200": {
                                "description": "ok",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/PrivateEnvelope"}
                                    }
                                },
                            }
                        }
                    }
                },
            },
            "components": {
                "schemas": {
                    "PublicEnvelope": {
                        "type": "object",
                        "properties": {
                            "payload": {"$ref": "#/components/schemas/PublicPayload"}
                        },
                    },
                    "PublicPayload": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}},
                    },
                    "PrivateEnvelope": {
                        "type": "object",
                        "properties": {
                            "payload": {"$ref": "#/components/schemas/PrivatePayload"}
                        },
                    },
                    "PrivatePayload": {
                        "type": "object",
                        "properties": {"secret": {"type": "string"}},
                    },
                }
            },
        }

        aggregated = build.aggregate_openapi_documents(
            [{"service_id": "service-a", "document": document}],
            fallback_entries=[],
        )

        self.assertEqual(
            set(aggregated["components"]["schemas"]),
            {"PublicEnvelope", "PublicPayload"},
        )

    def test_service_export_manifest_is_canonicalized_before_hashing(self):
        build = load_build_module()
        manifest_a = {
            "version": 1,
            "services": [{"service_id": "service-a", "source": "export", "path_count": 1}],
            "fallback_entries_used": [],
        }
        manifest_b = {
            "fallback_entries_used": [],
            "services": [{"path_count": 1, "source": "export", "service_id": "service-a"}],
            "version": 1,
        }

        self.assertEqual(
            build.sha256_for_json_document(manifest_a),
            build.sha256_for_json_document(manifest_b),
        )

    def test_revision_contains_exact_expected_keys(self):
        build = load_build_module()
        revision = build.build_revision_record(
            edge_commit_sha="abc123",
            openapi_sha256="openapi-sha",
            service_export_manifest_sha="manifest-sha",
        )

        self.assertEqual(
            revision,
            {
                "edge_commit_sha": "abc123",
                "openapi_sha256": "openapi-sha",
                "service_export_manifest_sha": "manifest-sha",
            },
        )
        self.assertEqual(
            set(revision),
            {"edge_commit_sha", "openapi_sha256", "service_export_manifest_sha"},
        )

    def test_fallback_allowlist_requires_supported_version(self):
        build = load_build_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            allowlist_path = Path(temp_dir) / "fallback-allowlist.json"
            allowlist_path.write_text(
                json.dumps({"version": 2, "entries": []}),
                encoding="utf-8",
            )

            with self.assertRaises(build.BuildError):
                build.load_fallback_allowlist(allowlist_path)

    def test_build_writes_revision_file_with_exact_keys(self):
        build = load_build_module()
        export_path = FIXTURES_ROOT / "pre-cutover-public-openapi.yaml"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            docs_root = temp_root / "public-api-docs"
            docs_root.mkdir()

            (docs_root / "fallback-allowlist.json").write_text(
                json.dumps({"version": 1, "entries": []}),
                encoding="utf-8",
            )

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

            revision = json.loads((docs_root / "revision.json").read_text(encoding="utf-8"))

        self.assertEqual(
            revision,
            {
                "edge_commit_sha": "edge-sha",
                "openapi_sha256": revision["openapi_sha256"],
                "service_export_manifest_sha": revision["service_export_manifest_sha"],
            },
        )
        self.assertEqual(
            set(revision),
            {"edge_commit_sha", "openapi_sha256", "service_export_manifest_sha"},
        )


if __name__ == "__main__":
    unittest.main()
