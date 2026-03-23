from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from django.test import SimpleTestCase, override_settings
from rest_framework.exceptions import APIException, ValidationError

from accounts.services.driver_link_service import DriverLinkService


class DriverLinkServiceTests(SimpleTestCase):
    @override_settings(DRIVER_PROFILE_BASE_URL="http://driver-profile-api:8000")
    @patch("accounts.services.driver_link_service.urlopen")
    def test_not_found_maps_to_validation_error(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://driver-profile-api:8000/30000000-0000-0000-0000-000000000001/",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=BytesIO(b'{"details":{"driver_id":["Driver not found."]}}'),
        )

        with self.assertRaises(ValidationError) as exc:
            DriverLinkService().link_account_to_driver(
                account_id="20000000-0000-0000-0000-000000000001",
                driver_id="30000000-0000-0000-0000-000000000001",
                authorization="Bearer token",
            )

        self.assertEqual(exc.exception.detail["driver_id"][0], "Driver not found.")

    @override_settings(DRIVER_PROFILE_BASE_URL="http://driver-profile-api:8000")
    @patch("accounts.services.driver_link_service.urlopen")
    def test_server_error_maps_to_api_exception(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://driver-profile-api:8000/30000000-0000-0000-0000-000000000001/",
            code=500,
            msg="Server Error",
            hdrs=None,
            fp=BytesIO(b'{"details":{"detail":["upstream exploded"]}}'),
        )

        with self.assertRaises(APIException) as exc:
            DriverLinkService().link_account_to_driver(
                account_id="20000000-0000-0000-0000-000000000001",
                driver_id="30000000-0000-0000-0000-000000000001",
                authorization="Bearer token",
            )

        self.assertEqual(str(exc.exception.detail), "Driver profile service is unavailable.")

    @override_settings(DRIVER_PROFILE_BASE_URL="http://driver-profile-api:8000")
    @patch("accounts.services.driver_link_service.urlopen")
    def test_network_error_maps_to_api_exception(self, mock_urlopen):
        mock_urlopen.side_effect = URLError("connection refused")

        with self.assertRaises(APIException) as exc:
            DriverLinkService().link_account_to_driver(
                account_id="20000000-0000-0000-0000-000000000001",
                driver_id="30000000-0000-0000-0000-000000000001",
                authorization="Bearer token",
            )

        self.assertEqual(str(exc.exception.detail), "Driver profile service is unavailable.")
