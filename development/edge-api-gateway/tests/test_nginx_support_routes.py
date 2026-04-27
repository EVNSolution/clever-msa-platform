from pathlib import Path
import unittest


NGINX_CONF = Path(__file__).resolve().parents[1] / "nginx.conf"


class NginxSupportRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = NGINX_CONF.read_text()

    def test_support_slice_uses_direct_service_connect_endpoints(self):
        self.assertIn("location /api/regions/", self.config)
        self.assertIn("proxy_pass http://region-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$region_registry_upstream;", self.config)

        self.assertIn("location /api/region-analytics/", self.config)
        self.assertIn("proxy_pass http://region-analytics-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$region_analytics_upstream;", self.config)

        self.assertIn("location /api/announcements/", self.config)
        self.assertIn("proxy_pass http://announcement-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$announcement_registry_upstream;", self.config)

        self.assertIn("location /api/ticket/", self.config)
        self.assertIn("proxy_pass http://support-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$support_registry_upstream;", self.config)

        self.assertIn("location /api/notifications/", self.config)
        self.assertIn("proxy_pass http://notification-hub-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$notification_hub_upstream;", self.config)


if __name__ == "__main__":
    unittest.main()
