from pathlib import Path
import subprocess
import sys
import unittest


RENDER_SCRIPT = Path(__file__).resolve().parents[1] / "render_gateway_config.py"


def render(profile: str, route_groups: str = "") -> str:
    command = [sys.executable, str(RENDER_SCRIPT), "--profile", profile]
    if route_groups:
        command.extend(["--route-groups", route_groups])
    return subprocess.check_output(command, text=True)


class RenderGatewayConfigTests(unittest.TestCase):
    def test_partial_people_and_assets_includes_only_people_routes(self):
        config = render("partial", "people-and-assets")

        self.assertIn("proxy_pass http://driver-profile-api:8000;", config)
        self.assertIn("proxy_pass http://personnel-document-registry-api:8000;", config)
        self.assertIn("proxy_pass http://vehicle-asset-api:8000;", config)
        self.assertIn("proxy_pass http://driver-vehicle-assignment-api:8000;", config)

        self.assertNotIn("dispatch-registry-api:8000", config)
        self.assertNotIn("settlement-payroll-api:8000", config)
        self.assertNotIn("region-registry-api:8000", config)
        self.assertNotIn("telemetry-hub-api:8000", config)

    def test_partial_settlement_includes_dispatch_and_settlement_but_omits_later_groups(self):
        config = render("partial", "people-and-assets,dispatch-inputs,settlement")

        self.assertIn("proxy_pass http://dispatch-registry-api:8000;", config)
        self.assertIn("proxy_pass http://delivery-record-api:8000;", config)
        self.assertIn("proxy_pass http://attendance-registry-api:8000;", config)
        self.assertIn("proxy_pass http://settlement-payroll-api:8000;", config)
        self.assertIn("proxy_pass http://settlement-ops-api:8000;", config)
        self.assertIn("proxy_pass http://settlement-registry-api:8000;", config)

        self.assertNotIn("dispatch-ops-api:8000", config)
        self.assertNotIn("driver-ops-api:8000", config)
        self.assertNotIn("vehicle-ops-api:8000", config)
        self.assertNotIn("region-registry-api:8000", config)
        self.assertNotIn("telemetry-hub-api:8000", config)


if __name__ == "__main__":
    unittest.main()
