from unittest import TestCase
from unittest.mock import Mock, patch
from urllib.error import HTTPError

from django.test import override_settings

from settlements.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


class SourceClientsTests(TestCase):
    def setUp(self) -> None:
        self.authorization = "Bearer token"

    def _build_response(self, payload: str):
        response = Mock()
        response.read.return_value = payload.encode("utf-8")
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        return response

    @override_settings(SETTLEMENT_PAYROLL_BASE_URL="http://settlement-payroll-api:8000/")
    @patch("settlements.services.source_clients.urlopen")
    def test_builds_urls_and_forwards_authorization_for_runs_and_items(self, mock_urlopen):
        mock_urlopen.side_effect = [
            self._build_response(
                """
                [
                    {"settlement_run_id": "run-1", "status": "draft"},
                    {"settlement_run_id": "run-2", "status": "closed"}
                ]
                """
            ),
            self._build_response('{"settlement_run_id": "run-1", "status": "draft"}'),
            self._build_response(
                """
                [
                    {"settlement_item_id": "item-1", "payout_status": "pending"},
                    {"settlement_item_id": "item-2", "payout_status": "paid"}
                ]
                """
            ),
            self._build_response('{"settlement_item_id": "item-1", "payout_status": "pending"}'),
        ]

        clients = SourceClients()

        runs = clients.list_settlement_runs(authorization=self.authorization)
        run = clients.get_settlement_run(settlement_run_id="run-1", authorization=self.authorization)
        items = clients.list_settlement_items(authorization=self.authorization)
        item = clients.get_settlement_item(settlement_item_id="item-1", authorization=self.authorization)

        self.assertEqual([entry["settlement_run_id"] for entry in runs], ["run-1", "run-2"])
        self.assertEqual(run["settlement_run_id"], "run-1")
        self.assertEqual([entry["settlement_item_id"] for entry in items], ["item-1", "item-2"])
        self.assertEqual(item["settlement_item_id"], "item-1")
        self.assertEqual(
            [call.args[0].full_url for call in mock_urlopen.call_args_list],
            [
                "http://settlement-payroll-api:8000/runs/",
                "http://settlement-payroll-api:8000/runs/run-1/",
                "http://settlement-payroll-api:8000/items/",
                "http://settlement-payroll-api:8000/items/item-1/",
            ],
        )
        self.assertEqual(
            [call.args[0].get_header("Authorization") for call in mock_urlopen.call_args_list],
            [self.authorization] * 4,
        )

    @patch("settlements.services.source_clients.urlopen")
    def test_request_json_maps_404_to_source_not_found_error_when_allowed(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://settlement-payroll-api:8000/runs/run-1/",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(SourceNotFoundError):
            SourceClients()._request_json(
                url="http://settlement-payroll-api:8000/runs/run-1/",
                authorization=self.authorization,
                allow_not_found=True,
            )

    @override_settings(SETTLEMENT_PAYROLL_BASE_URL="http://settlement-payroll-api:8000/")
    @patch("settlements.services.source_clients.urlopen")
    def test_list_settlement_items_maps_invalid_json_to_source_service_error(self, mock_urlopen):
        mock_urlopen.return_value = self._build_response("not-json")

        with self.assertRaises(SourceServiceError):
            SourceClients().list_settlement_items(authorization=self.authorization)

    @override_settings(SETTLEMENT_PAYROLL_BASE_URL="http://settlement-payroll-api:8000/")
    @patch("settlements.services.source_clients.urlopen")
    def test_list_settlement_runs_maps_http_500_to_source_service_error(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://settlement-payroll-api:8000/runs/",
            code=503,
            msg="Service Unavailable",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(SourceServiceError):
            SourceClients().list_settlement_runs(authorization=self.authorization)
