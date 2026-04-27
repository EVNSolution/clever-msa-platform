from pathlib import Path
import unittest


NGINX_CONF = Path(__file__).resolve().parents[1] / "nginx.conf"


class NginxSettlementRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = NGINX_CONF.read_text()

    def test_settlement_slice_uses_direct_service_connect_endpoints(self):
        self.assertIn("location /api/settlements/", self.config)
        self.assertIn("proxy_pass http://settlement-payroll-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$settlement_payroll_upstream;", self.config)

        self.assertIn("location /api/settlement-ops/", self.config)
        self.assertIn("proxy_pass http://settlement-ops-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$settlement_ops_upstream;", self.config)

        self.assertIn("location /api/settlement-registry/", self.config)
        self.assertIn("proxy_pass http://settlement-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$settlement_registry_upstream;", self.config)


if __name__ == "__main__":
    unittest.main()
