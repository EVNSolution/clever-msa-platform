from unittest import TestCase
from unittest.mock import MagicMock

from settlements.services.daily_settlement_service import DailySettlementReadService
from settlements.services.source_clients import SourceServiceError


class DailySettlementReadServiceTests(TestCase):
    def test_build_daily_settlements_enriches_payroll_truth_with_snapshot_ids(self):
        source_clients = MagicMock()
        source_clients.list_driver_daily_settlements.return_value = {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
            "summary": {
                "regular_days": 1,
                "special_days": 0,
                "total_amount": "56400.00",
            },
            "results": [
                {
                    "service_date": "2026-04-17",
                    "settlement_type": "regular",
                    "box_count": 12,
                    "unit_price": "4700.00",
                    "total_amount": "56400.00",
                }
            ],
        }
        source_clients.list_driver_daily_snapshots.return_value = [
            {
                "daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000001",
                "service_date": "2026-04-17",
            }
        ]

        payload = DailySettlementReadService(source_clients=source_clients).build_daily_settlements(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from="2026-04-01",
            date_to="2026-04-30",
            authorization="Bearer token",
        )

        self.assertEqual(
            payload["results"][0]["daily_delivery_input_snapshot_id"],
            "20000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(payload["summary"]["total_amount"], "56400.00")

    def test_build_daily_settlements_requires_snapshot_for_each_result_row(self):
        source_clients = MagicMock()
        source_clients.list_driver_daily_settlements.return_value = {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
            "summary": {
                "regular_days": 1,
                "special_days": 0,
                "total_amount": "56400.00",
            },
            "results": [
                {
                    "service_date": "2026-04-17",
                    "settlement_type": "regular",
                    "box_count": 12,
                    "unit_price": "4700.00",
                    "total_amount": "56400.00",
                }
            ],
        }
        source_clients.list_driver_daily_snapshots.return_value = []

        with self.assertRaises(SourceServiceError):
            DailySettlementReadService(source_clients=source_clients).build_daily_settlements(
                driver_id="10000000-0000-0000-0000-000000000001",
                date_from="2026-04-01",
                date_to="2026-04-30",
                authorization="Bearer token",
            )
