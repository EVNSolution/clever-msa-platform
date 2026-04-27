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

    @override_settings(SETTLEMENT_PAYROLL_BASE_URL="http://settlement-payroll-api:8000/")
    @patch("settlements.services.source_clients.urlopen")
    def test_builds_filtered_urls_for_scope(self, mock_urlopen):
        mock_urlopen.side_effect = [
            self._build_response('[{"settlement_run_id": "run-1", "status": "draft"}]'),
            self._build_response('[{"settlement_item_id": "item-1", "payout_status": "pending"}]'),
        ]

        clients = SourceClients()
        company_id = "10000000-0000-0000-0000-000000000001"
        fleet_id = "20000000-0000-0000-0000-000000000002"

        clients.list_settlement_runs(authorization=self.authorization, company_id=company_id, fleet_id=fleet_id)
        clients.list_settlement_items(authorization=self.authorization, company_id=company_id, fleet_id=fleet_id)

        self.assertEqual(
            [call.args[0].full_url for call in mock_urlopen.call_args_list],
            [
                "http://settlement-payroll-api:8000/runs/?company_id=10000000-0000-0000-0000-000000000001&fleet_id=20000000-0000-0000-0000-000000000002",
                "http://settlement-payroll-api:8000/items/?company_id=10000000-0000-0000-0000-000000000001&fleet_id=20000000-0000-0000-0000-000000000002",
            ],
        )

    @override_settings(DRIVER_PROFILE_BASE_URL="http://driver-profile-api:8000/")
    @patch("settlements.services.source_clients.urlopen")
    def test_builds_paged_driver_urls_for_latest_settlement_reads(self, mock_urlopen):
        mock_urlopen.return_value = self._build_response(
            """
            {
                "count": 12,
                "page": 2,
                "page_size": 10,
                "results": [
                    {"driver_id": "driver-11", "name": "Driver 11"},
                    {"driver_id": "driver-12", "name": "Driver 12"}
                ]
            }
            """
        )

        payload = SourceClients().list_drivers(
            authorization=self.authorization,
            company_id="10000000-0000-0000-0000-000000000001",
            fleet_id="20000000-0000-0000-0000-000000000002",
            page=2,
            page_size=10,
        )

        self.assertEqual(payload["count"], 12)
        self.assertEqual(payload["page"], 2)
        self.assertEqual(payload["page_size"], 10)
        self.assertEqual(len(payload["results"]), 2)
        self.assertEqual(
            mock_urlopen.call_args.args[0].full_url,
            "http://driver-profile-api:8000/?page=2&page_size=10&company_id=10000000-0000-0000-0000-000000000001&fleet_id=20000000-0000-0000-0000-000000000002",
        )

    @override_settings(
        SETTLEMENT_PAYROLL_BASE_URL="http://settlement-payroll-api:8000/",
        DELIVERY_RECORD_BASE_URL="http://delivery-record-api:8000/",
    )
    @patch("settlements.services.source_clients.urlopen")
    def test_builds_urls_for_driver_daily_settlements_and_snapshot_enrichment(self, mock_urlopen):
        mock_urlopen.side_effect = [
            self._build_response(
                """
                {
                    "driver_id": "10000000-0000-0000-0000-000000000001",
                    "date_from": "2026-04-01",
                    "date_to": "2026-04-30",
                    "summary": {"regular_days": 1, "special_days": 0, "total_amount": "56400.00"},
                    "results": []
                }
                """
            ),
            self._build_response(
                """
                [
                    {
                        "daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000001",
                        "service_date": "2026-04-17"
                    }
                ]
                """
            ),
        ]

        clients = SourceClients()
        clients.list_driver_daily_settlements(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from="2026-04-01",
            date_to="2026-04-30",
            authorization=self.authorization,
        )
        clients.list_driver_daily_snapshots(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from="2026-04-01",
            date_to="2026-04-30",
            authorization=self.authorization,
        )

        self.assertEqual(
            [call.args[0].full_url for call in mock_urlopen.call_args_list],
            [
                "http://settlement-payroll-api:8000/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30",
                "http://delivery-record-api:8000/daily-snapshots/?driver_id=10000000-0000-0000-0000-000000000001&status=active",
            ],
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
