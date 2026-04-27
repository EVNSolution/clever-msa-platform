from pathlib import Path
import unittest


BOOTSTRAP_PROOF_CONF = Path(__file__).resolve().parents[1] / "nginx.bootstrap-proof.conf"
STATIC_DOCS_ROOT = "/opt/edge/public-api-docs"


class NginxBootstrapProofRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = BOOTSTRAP_PROOF_CONF.read_text()

    def test_bootstrap_proof_keeps_front_auth_and_org_routes(self):
        self.assertIn("location / {", self.config)
        self.assertIn("proxy_pass http://web-console:5174;", self.config)
        self.assertIn("location /api/auth/ {", self.config)
        self.assertIn("proxy_pass http://account-auth-api:8000;", self.config)
        self.assertIn("location /api/org/ {", self.config)
        self.assertIn("proxy_pass http://organization-master-api:8000;", self.config)

    def test_bootstrap_proof_omits_later_slice_upstreams(self):
        self.assertNotIn("driver-profile-api:8000", self.config)
        self.assertNotIn("dispatch-registry-api:8000", self.config)
        self.assertNotIn("settlement-registry-api:8000", self.config)
        self.assertNotIn("support-registry-api:8000", self.config)
        self.assertNotIn("telemetry-hub-api:8000", self.config)

    def test_bootstrap_proof_serves_public_docs_from_edge_static_assets(self):
        self.assertIn("location = /openapi.yaml", self.config)
        self.assertIn(f"alias {STATIC_DOCS_ROOT}/openapi.yaml;", self.config)
        self.assertNotIn("location = /openapi.yaml {\n            proxy_pass http://account-auth-api:8000;", self.config)

        self.assertIn("location = /swagger", self.config)
        self.assertIn("return 301 /swagger/;", self.config)
        self.assertIn("location /swagger/", self.config)
        self.assertIn(f"alias {STATIC_DOCS_ROOT}/swagger/;", self.config)
        self.assertIn("try_files $uri $uri/ /swagger/index.html =404;", self.config)

        self.assertIn("location = /redoc", self.config)
        self.assertIn("return 301 /redoc/;", self.config)
        self.assertIn("location /redoc/", self.config)
        self.assertIn(f"alias {STATIC_DOCS_ROOT}/redoc/;", self.config)
        self.assertIn("try_files $uri $uri/ /redoc/index.html =404;", self.config)


if __name__ == "__main__":
    unittest.main()
