from unittest import TestCase
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from django.test import override_settings


class SourceClientsTests(TestCase):
    def setUp(self) -> None:
        self.authorization = "Bearer token"
        self.driver_id = "10000000-0000-0000-0000-000000000001"

    def _build_response(self, payload: str):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = payload.encode("utf-8")
        return response

    @override_settings(DRIVER_PROFILE_BASE_URL="http://driver-profile-api:8000")
    @patch("personneldocuments.services.source_clients.urlopen")
    def test_validate_driver_exists_forwards_caller_token(self, mocked_urlopen) -> None:
        from personneldocuments.services.source_clients import SourceClients

        mocked_urlopen.side_effect = [
            self._build_response(f'{{"driver_id":"{self.driver_id}","name":"Seed Driver"}}')
        ]

        SourceClients().validate_driver_exists(
            driver_id=self.driver_id,
            authorization=self.authorization,
        )

        request = mocked_urlopen.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), self.authorization)
        self.assertEqual(request.full_url, f"http://driver-profile-api:8000/{self.driver_id}/")

    @override_settings(DRIVER_PROFILE_BASE_URL="http://driver-profile-api:8000")
    @patch("personneldocuments.services.source_clients.urlopen")
    def test_validate_driver_exists_maps_404_to_validation_error(self, mocked_urlopen) -> None:
        from personneldocuments.services.source_clients import SourceClients, SourceValidationError

        mocked_urlopen.side_effect = HTTPError(
            url=f"http://driver-profile-api:8000/{self.driver_id}/",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(SourceValidationError) as context:
            SourceClients().validate_driver_exists(
                driver_id=self.driver_id,
                authorization=self.authorization,
            )

        self.assertEqual(context.exception.field, "driver_id")
        self.assertEqual(str(context.exception), "Referenced driver does not exist.")
