from pathlib import Path
import unittest


PARTIAL_BASE_START_CONF = Path(__file__).resolve().parents[1] / "nginx.partial.base.start.conf"
STATIC_DOCS_ROOT = "/opt/edge/public-api-docs"


class NginxPartialDocsRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = PARTIAL_BASE_START_CONF.read_text()

    def test_partial_base_start_serves_public_docs_from_edge_static_assets(self):
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
