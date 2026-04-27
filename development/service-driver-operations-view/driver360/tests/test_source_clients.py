from unittest import TestCase
from unittest.mock import patch

from django.test import override_settings

from driver360.services.source_clients import SourceClients


def fake_response(body: str):
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return body.encode("utf-8")

    return FakeResponse()


class SourceClientsTests(TestCase):
    @override_settings(ACCOUNT_AUTH_BASE_URL="http://account-auth-api:8000")
    @patch("driver360.services.source_clients.urlopen")
    def test_list_driver_account_links_builds_driver_filtered_url(self, mock_urlopen):
        mock_urlopen.return_value = fake_response("[]")

        payload = SourceClients().list_driver_account_links(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertEqual(payload, [])
        self.assertEqual(
            mock_urlopen.call_args.args[0].full_url,
            "http://account-auth-api:8000/driver-account-links/?driver_id=10000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(mock_urlopen.call_args.args[0].headers["Authorization"], "Bearer token")

    @override_settings(ACCOUNT_AUTH_BASE_URL="http://account-auth-api:8000")
    @patch("driver360.services.source_clients.urlopen")
    def test_list_driver_account_links_builds_account_filtered_url(self, mock_urlopen):
        mock_urlopen.return_value = fake_response("[]")

        payload = SourceClients().list_driver_account_links(
            driver_account_id="30000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertEqual(payload, [])
        self.assertEqual(
            mock_urlopen.call_args.args[0].full_url,
            "http://account-auth-api:8000/driver-account-links/?driver_account_id=30000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(mock_urlopen.call_args.args[0].headers["Authorization"], "Bearer token")

    @override_settings(SETTLEMENT_OPS_BASE_URL="http://settlement-ops-api:8000")
    @patch("driver360.services.source_clients.urlopen")
    def test_get_latest_settlement_builds_driver_scoped_ops_url(self, mock_urlopen):
        mock_urlopen.return_value = fake_response(
            """
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "latest_settlement": null
            }
            """
        )

        payload = SourceClients().get_latest_settlement(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertEqual(payload["driver_id"], "10000000-0000-0000-0000-000000000001")
        self.assertEqual(
            mock_urlopen.call_args.args[0].full_url,
            "http://settlement-ops-api:8000/drivers/10000000-0000-0000-0000-000000000001/latest-settlement/",
        )
        self.assertEqual(mock_urlopen.call_args.args[0].headers["Authorization"], "Bearer token")

    @override_settings(PERSONNEL_DOCUMENT_BASE_URL="http://personnel-document-registry-api:8000")
    @patch("driver360.services.source_clients.urlopen")
    def test_list_personnel_documents_builds_driver_filtered_url(self, mock_urlopen):
        mock_urlopen.return_value = fake_response("[]")

        payload = SourceClients().list_personnel_documents(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertEqual(payload, [])
        self.assertEqual(
            mock_urlopen.call_args.args[0].full_url,
            "http://personnel-document-registry-api:8000/documents/?driver_id=10000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(mock_urlopen.call_args.args[0].headers["Authorization"], "Bearer token")

    @override_settings(SETTLEMENT_OPS_BASE_URL="http://settlement-ops-api:8000")
    @patch("driver360.services.source_clients.urlopen")
    def test_list_daily_settlements_builds_driver_scoped_ops_url(self, mock_urlopen):
        mock_urlopen.return_value = fake_response(
            """
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "date_from": "2026-04-01",
                "date_to": "2026-04-30",
                "summary": {"regular_days": 0, "special_days": 0, "total_amount": "0.00"},
                "results": []
            }
            """
        )

        payload = SourceClients().list_daily_settlements(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from="2026-04-01",
            date_to="2026-04-30",
            authorization="Bearer token",
        )

        self.assertEqual(payload["driver_id"], "10000000-0000-0000-0000-000000000001")
        self.assertEqual(
            mock_urlopen.call_args.args[0].full_url,
            "http://settlement-ops-api:8000/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30",
        )
        self.assertEqual(mock_urlopen.call_args.args[0].headers["Authorization"], "Bearer token")
