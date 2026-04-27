from pathlib import Path
import unittest


NGINX_CONF = Path(__file__).resolve().parents[1] / "nginx.conf"
DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile"
BUILD_WORKFLOW = (
    Path(__file__).resolve().parents[1] / ".github" / "workflows" / "build-image.yml"
)
STATIC_DOCS_ROOT = "/opt/edge/public-api-docs"


class NginxDocsRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = NGINX_CONF.read_text()
        cls.dockerfile = DOCKERFILE.read_text()
        cls.build_workflow = BUILD_WORKFLOW.read_text()

    def _get_location_block(self, location: str) -> str:
        lines = self.config.splitlines()
        start = None
        for index, line in enumerate(lines):
            if line.strip() == f"location {location} {{":
                start = index
                break

        self.assertIsNotNone(start, f"missing nginx location block for {location}")

        block = []
        depth = 0
        for line in lines[start:]:
            stripped = line.strip()
            if stripped.endswith("{"):
                depth += stripped.count("{")
            if stripped == "}":
                depth -= 1
                block.append(line)
                if depth == 0:
                    break
                continue
            block.append(line)

        return "\n".join(block)

    def test_openapi_yaml_is_served_from_edge_static_assets(self):
        block = self._get_location_block("= /openapi.yaml")

        self.assertIn("location = /openapi.yaml", block)
        self.assertIn(f"alias {STATIC_DOCS_ROOT}/openapi.yaml;", block)
        self.assertNotIn("proxy_pass http://account-auth-api:8000;", block)

    def test_swagger_and_redoc_are_served_by_edge_static_assets(self):
        swagger_block = self._get_location_block("/swagger/")
        redoc_block = self._get_location_block("/redoc/")

        self.assertIn("location /swagger/", swagger_block)
        self.assertIn(f"alias {STATIC_DOCS_ROOT}/swagger/;", swagger_block)
        self.assertIn("index index.html;", swagger_block)
        self.assertIn("try_files $uri $uri/ /swagger/index.html =404;", swagger_block)
        self.assertNotIn("proxy_pass http://account-auth-api:8000;", swagger_block)

        self.assertIn("location /redoc/", redoc_block)
        self.assertIn(f"alias {STATIC_DOCS_ROOT}/redoc/;", redoc_block)
        self.assertIn("index index.html;", redoc_block)
        self.assertIn("try_files $uri $uri/ /redoc/index.html =404;", redoc_block)
        self.assertNotIn("proxy_pass http://account-auth-api:8000;", redoc_block)

    def test_swagger_and_redoc_redirect_variants_keep_trailing_slash_routes(self):
        self.assertIn("location = /swagger", self.config)
        self.assertIn("return 301 /swagger/;", self.config)
        self.assertIn("location = /redoc", self.config)
        self.assertIn("return 301 /redoc/;", self.config)

    def test_docker_image_copies_public_docs_into_static_docs_root(self):
        self.assertIn(
            f"COPY public-api-docs/ {STATIC_DOCS_ROOT}/",
            self.dockerfile,
        )
        self.assertIn(
            "RUN test -f /opt/edge/public-api-docs/openapi.yaml",
            self.dockerfile,
        )
        self.assertIn(
            "test -f /opt/edge/public-api-docs/revision.json",
            self.dockerfile,
        )
        self.assertIn(
            "test -f /opt/edge/public-api-docs/service-export-manifest.json",
            self.dockerfile,
        )
        self.assertIn('ENTRYPOINT ["/docker-entrypoint.sh"]', self.dockerfile)

    def test_build_workflow_generates_and_uploads_public_docs_before_docker_build(self):
        workflow = self.build_workflow

        for snippet in (
            "uses: actions/setup-python@",
            "python -m pip install --upgrade pip",
            "python -m pip install -r requirements-public-openapi.txt",
            "python scripts/prepare_public_openapi_sources.py",
            "python scripts/install_public_openapi_source_requirements.py",
            "export EDGE_COMMIT_SHA=${GITHUB_SHA}",
            "python scripts/build_public_openapi.py",
            "python scripts/check_public_openapi_parity.py",
            "python -m unittest tests.test_nginx_docs_routes tests.test_nginx_bootstrap_proof_routes tests.test_nginx_partial_docs_routes tests.test_public_openapi_build tests.test_public_openapi_parity",
            "uses: actions/upload-artifact@",
            "public-api-docs/openapi.yaml",
            "public-api-docs/revision.json",
            "public-api-docs/service-export-manifest.json",
            "public-api-docs/parity-report.json",
            "if-no-files-found: error",
            'docker build -t "${{ steps.meta.outputs.image_uri }}" .',
        ):
            with self.subTest(snippet=snippet):
                self.assertIn(snippet, workflow)

        install_index = workflow.index("python -m pip install -r requirements-public-openapi.txt")
        source_checkout_index = workflow.index("python scripts/prepare_public_openapi_sources.py")
        service_install_index = workflow.index("python scripts/install_public_openapi_source_requirements.py")
        export_index = workflow.index("export EDGE_COMMIT_SHA=${GITHUB_SHA}")
        build_docs_index = workflow.index("python scripts/build_public_openapi.py")
        parity_index = workflow.index("python scripts/check_public_openapi_parity.py")
        test_index = workflow.index(
            "python -m unittest tests.test_nginx_docs_routes tests.test_nginx_bootstrap_proof_routes tests.test_nginx_partial_docs_routes tests.test_public_openapi_build tests.test_public_openapi_parity"
        )
        upload_index = workflow.index("uses: actions/upload-artifact@")
        docker_build_index = workflow.index('docker build -t "${{ steps.meta.outputs.image_uri }}" .')

        self.assertLess(install_index, export_index)
        self.assertLess(source_checkout_index, service_install_index)
        self.assertLess(service_install_index, export_index)
        self.assertLess(export_index, build_docs_index)
        self.assertLess(build_docs_index, parity_index)
        self.assertLess(parity_index, test_index)
        self.assertLess(test_index, upload_index)
        self.assertLess(upload_index, docker_build_index)

    def test_build_workflow_prepares_all_public_openapi_sources_with_repo_read_token(self):
        workflow = self.build_workflow

        self.assertIn("GH_REPO_READ_TOKEN", workflow)
        self.assertIn(
            "GH_REPO_READ_TOKEN: ${{ secrets.GH_ACTIONS_REPO_READ_TOKEN != '' && secrets.GH_ACTIONS_REPO_READ_TOKEN || secrets.GH_ACTIONS_CLEVER_PLATFORM_READ_TOKEN != '' && secrets.GH_ACTIONS_CLEVER_PLATFORM_READ_TOKEN || github.token }}",
            workflow,
        )
        self.assertIn("python scripts/prepare_public_openapi_sources.py", workflow)
        self.assertIn("python scripts/install_public_openapi_source_requirements.py", workflow)

    def test_build_workflow_validates_each_generated_artifact_before_upload(self):
        workflow = self.build_workflow

        self.assertIn("- name: Validate public OpenAPI artifacts", workflow)
        for snippet in (
            "test -f public-api-docs/openapi.yaml",
            "test -f public-api-docs/revision.json",
            "test -f public-api-docs/service-export-manifest.json",
            "test -f public-api-docs/parity-report.json",
        ):
            with self.subTest(snippet=snippet):
                self.assertIn(snippet, workflow)

        validate_index = workflow.index("- name: Validate public OpenAPI artifacts")
        upload_index = workflow.index("uses: actions/upload-artifact@")
        docker_build_index = workflow.index('docker build -t "${{ steps.meta.outputs.image_uri }}" .')

        self.assertLess(validate_index, upload_index)
        self.assertLess(validate_index, docker_build_index)
        self.assertIn("if-no-files-found: error", workflow)

    def test_account_access_admin_has_redirect_and_prefixed_route(self):
        self.assertIn("location = /admin/account-access", self.config)
        self.assertIn("return 301 /admin/account-access/;", self.config)
        self.assertIn("location ^~ /admin/account-access/", self.config)
        self.assertNotIn("rewrite ^/admin/account-access/(.*)$ /admin/$1 break;", self.config)
        self.assertIn("proxy_pass http://account-auth-api:8000;", self.config)

    def test_account_access_admin_static_is_forwarded(self):
        self.assertIn("location ^~ /static/admin/", self.config)
        self.assertIn("proxy_pass http://account-auth-api:8000;", self.config)

    def test_ecs_runtime_uses_aws_vpc_dns_resolver(self):
        self.assertIn("resolver 169.254.169.253 valid=10s ipv6=off;", self.config)
        self.assertNotIn("resolver 127.0.0.11 valid=10s ipv6=off;", self.config)

    def test_front_and_auth_slice_use_direct_service_connect_endpoints(self):
        self.assertIn("proxy_pass http://web-console:5174;", self.config)
        self.assertIn("proxy_pass http://account-auth-api:8000;", self.config)

    def test_organization_slice_uses_direct_service_connect_endpoint(self):
        self.assertIn("location /api/org/", self.config)
        self.assertIn("rewrite ^/api/org/(.*)$ /$1 break;", self.config)
        self.assertIn("proxy_pass http://organization-master-api:8000;", self.config)
        self.assertNotIn("organization-http.ev-dashboard.internal:8000", self.config)

    def test_people_and_assets_slice_uses_direct_service_connect_endpoints(self):
        self.assertIn("location /api/drivers/", self.config)
        self.assertIn("proxy_pass http://driver-profile-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$driver_profile_upstream;", self.config)

        self.assertIn("location /api/personnel-documents/", self.config)
        self.assertIn("proxy_pass http://personnel-document-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$personnel_document_registry_upstream;", self.config)

        self.assertIn("location /api/vehicles/", self.config)
        self.assertIn("proxy_pass http://vehicle-asset-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$vehicle_asset_upstream;", self.config)

        self.assertIn("location /api/driver-vehicle-assignments/", self.config)
        self.assertIn("proxy_pass http://driver-vehicle-assignment-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$driver_vehicle_assignment_upstream;", self.config)

    def test_dispatch_inputs_slice_uses_direct_service_connect_endpoints(self):
        self.assertIn("location /api/dispatch/", self.config)
        self.assertIn("proxy_pass http://dispatch-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$dispatch_registry_upstream;", self.config)

        self.assertIn("location /api/delivery-record/", self.config)
        self.assertIn("proxy_pass http://delivery-record-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$delivery_record_upstream;", self.config)

        self.assertIn("location /api/attendance/", self.config)
        self.assertIn("proxy_pass http://attendance-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$attendance_registry_upstream;", self.config)

    def test_dispatch_read_models_use_direct_service_connect_endpoints(self):
        self.assertIn("location /api/dispatch-ops/", self.config)
        self.assertIn("proxy_pass http://dispatch-ops-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$dispatch_ops_upstream;", self.config)
        self.assertIn("proxy_set_header Host $proxy_host;", self.config)

        self.assertIn("location /api/driver-ops/", self.config)
        self.assertIn("proxy_pass http://driver-ops-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$driver_ops_upstream;", self.config)
        self.assertNotIn("location /api/driver-ops/ {\n            rewrite ^/api/driver-ops/(.*)$ /$1 break;\n            proxy_pass http://driver-ops-api:8000;\n            proxy_http_version 1.1;\n            proxy_set_header Host $host;", self.config)

        self.assertIn("location /api/vehicle-ops/", self.config)
        self.assertIn("proxy_pass http://vehicle-ops-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$vehicle_ops_upstream;", self.config)


if __name__ == "__main__":
    unittest.main()
