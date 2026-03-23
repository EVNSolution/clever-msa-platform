from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from terminals.services.vehicle_registry_client import (
    SourceNotFoundError,
    VehicleRegistryClient,
)


class VehicleRegistryClientTests(SimpleTestCase):
    @patch("terminals.services.vehicle_registry_client.urlopen")
    def test_get_vehicle_returns_decoded_json(self, mocked_urlopen):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"vehicle_id":"v1","vehicle_status":"active"}'
        mocked_urlopen.return_value = response

        payload = VehicleRegistryClient().get_vehicle(vehicle_id="v1", authorization="Bearer token")

        self.assertEqual(payload["vehicle_id"], "v1")
        self.assertEqual(payload["vehicle_status"], "active")

    @patch("terminals.services.vehicle_registry_client.urlopen")
    def test_get_vehicle_raises_not_found_for_404(self, mocked_urlopen):
        from urllib.error import HTTPError

        mocked_urlopen.side_effect = HTTPError(
            url="http://example.test/vehicle",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(SourceNotFoundError):
            VehicleRegistryClient().get_vehicle(vehicle_id="v1", authorization="Bearer token")
