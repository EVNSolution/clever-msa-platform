from pathlib import Path
import unittest


NGINX_CONF = Path(__file__).resolve().parents[1] / "nginx.conf"


class NginxTerminalTelemetryRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = NGINX_CONF.read_text()

    def test_terminal_and_telemetry_routes_use_direct_service_connect_endpoints(self):
        self.assertIn("location /api/terminals/ {", self.config)
        self.assertIn("proxy_pass http://terminal-registry-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$terminal_registry_upstream;", self.config)

        self.assertIn("location /api/telemetry/ {", self.config)
        self.assertIn("proxy_pass http://telemetry-hub-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$telemetry_hub_upstream;", self.config)

        self.assertIn("location = /api/telemetry-dead-letters/health/ {", self.config)
        self.assertIn("proxy_pass http://telemetry-dead-letter-api:8000/health/;", self.config)
        self.assertNotIn("proxy_pass http://$telemetry_dead_letter_upstream/health/;", self.config)

        self.assertIn("location = /api/telemetry-dead-letters/ {", self.config)
        self.assertIn("proxy_pass http://telemetry-dead-letter-api:8000/;", self.config)
        self.assertNotIn("proxy_pass http://$telemetry_dead_letter_upstream/;", self.config)

        self.assertIn("location /api/telemetry-dead-letters/ {", self.config)
        self.assertIn("proxy_pass http://telemetry-dead-letter-api:8000;", self.config)
        self.assertNotIn("proxy_pass http://$telemetry_dead_letter_upstream;", self.config)


if __name__ == "__main__":
    unittest.main()
