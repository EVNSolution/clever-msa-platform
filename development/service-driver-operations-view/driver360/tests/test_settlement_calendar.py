from unittest import TestCase
from unittest.mock import MagicMock, patch

from rest_framework.test import APIClient

from driver360.services.settlement_calendar_service import SettlementCalendarService
from driver360.services.source_clients import SourceServiceError


class SettlementCalendarServiceTests(TestCase):
    def test_get_settlement_calendar_returns_needs_link_if_no_active_link(self):
        source_clients = MagicMock()
        source_clients.list_driver_account_links.return_value = []

        payload = SettlementCalendarService(source_clients=source_clients).get_settlement_calendar(
            driver_account_id="30000000-0000-0000-0000-000000000001",
            date_from="2026-04-01",
            date_to="2026-04-30",
            authorization="Bearer token",
        )

        self.assertEqual(payload, {"status": "needs_link", "results": []})
        source_clients.list_daily_settlements.assert_not_called()

    def test_get_settlement_calendar_wraps_daily_settlement_payload_for_active_link(self):
        source_clients = MagicMock()
        source_clients.list_driver_account_links.return_value = [
            {
                "driver_account_id": "30000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "unlinked_at": None,
            }
        ]
        source_clients.list_daily_settlements.return_value = {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
            "summary": {
                "regular_days": 19,
                "special_days": 4,
                "total_amount": "152300.00",
            },
            "results": [
                {
                    "service_date": "2026-04-17",
                    "daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000001",
                    "settlement_type": "regular",
                    "box_count": 12,
                    "unit_price": "4700.00",
                    "total_amount": "56400.00",
                }
            ],
        }

        payload = SettlementCalendarService(source_clients=source_clients).get_settlement_calendar(
            driver_account_id="30000000-0000-0000-0000-000000000001",
            date_from="2026-04-01",
            date_to="2026-04-30",
            authorization="Bearer token",
        )

        self.assertEqual(payload["status"], "linked")
        self.assertEqual(payload["driver_id"], "10000000-0000-0000-0000-000000000001")
        self.assertEqual(payload["summary"]["total_amount"], "152300.00")
        source_clients.list_driver_account_links.assert_called_once_with(
            driver_account_id="30000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )
        source_clients.list_daily_settlements.assert_called_once_with(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from="2026-04-01",
            date_to="2026-04-30",
            authorization="Bearer token",
        )


class SettlementCalendarMeApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    @patch("driver360.authentication.JWTAuthentication.authenticate")
    @patch("driver360.views.SettlementCalendarService")
    def test_settlement_calendar_returns_needs_link_payload(self, mock_service_class, mock_auth):
        mock_principal = MagicMock()
        mock_principal.account_id = "30000000-0000-0000-0000-000000000001"
        mock_principal.role = "user"
        mock_auth.return_value = (
            mock_principal,
            {"sub": mock_principal.account_id, "type": "access", "role": "user"},
        )
        mock_service_class.return_value.get_settlement_calendar.return_value = {
            "status": "needs_link",
            "results": [],
        }

        response = self.client.get("/me/settlement-calendar/?date_from=2026-04-01&date_to=2026-04-30")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "needs_link", "results": []})

    @patch("driver360.authentication.JWTAuthentication.authenticate")
    @patch("driver360.views.SettlementCalendarService")
    def test_settlement_calendar_maps_upstream_error_to_503(self, mock_service_class, mock_auth):
        mock_principal = MagicMock()
        mock_principal.account_id = "30000000-0000-0000-0000-000000000001"
        mock_principal.role = "user"
        mock_auth.return_value = (
            mock_principal,
            {"sub": mock_principal.account_id, "type": "access", "role": "user"},
        )
        mock_service_class.return_value.get_settlement_calendar.side_effect = SourceServiceError("boom")

        response = self.client.get("/me/settlement-calendar/?date_from=2026-04-01&date_to=2026-04-30")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "upstream_service_unavailable")
