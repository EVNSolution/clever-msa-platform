from datetime import date
from decimal import Decimal
from unittest import TestCase
from unittest.mock import MagicMock
from uuid import uuid4

from settlements.services.daily_settlement_source_service import DailySettlementSourceService
from settlements.services.source_clients import SourceNotFoundError


class DailySettlementSourceServiceTests(TestCase):
    def setUp(self) -> None:
        self.source_clients = MagicMock()
        self.service = DailySettlementSourceService(source_clients=self.source_clients)

    def test_build_driver_daily_settlements_uses_box_count_times_unit_price_formula(self):
        self.source_clients.list_driver_daily_snapshots.return_value = [
            {
                "daily_delivery_input_snapshot_id": str(uuid4()),
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "service_date": "2026-04-17",
                "delivery_count": 12,
                "status": "active",
            }
        ]
        self.source_clients.get_company_fleet_pricing_table.return_value = {
            "box_purchase_unit_price": "4700.00",
        }
        self.source_clients.bulk_lookup_attendance_days.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "attendance_date": "2026-04-17",
                "final_status": "worked",
            }
        ]
        self.source_clients.list_driver_day_exceptions.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "dispatch_date": "2026-04-17",
                "work_rule": {"system_kind": "overtime"},
            }
        ]

        payload = self.service.build_driver_daily_settlements(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from=date(2026, 4, 1),
            date_to=date(2026, 4, 30),
            authorization="Bearer token",
        )

        self.assertEqual(payload["summary"]["regular_days"], 0)
        self.assertEqual(payload["summary"]["special_days"], 1)
        self.assertEqual(payload["summary"]["total_amount"], Decimal("56400.00"))
        self.assertEqual(payload["results"][0]["settlement_type"], "special")
        self.assertEqual(payload["results"][0]["box_count"], 12)
        self.assertEqual(payload["results"][0]["unit_price"], Decimal("4700.00"))
        self.assertEqual(payload["results"][0]["total_amount"], Decimal("56400.00"))

    def test_build_driver_daily_settlements_excludes_non_worked_attendance(self):
        self.source_clients.list_driver_daily_snapshots.return_value = [
            {
                "daily_delivery_input_snapshot_id": str(uuid4()),
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "service_date": "2026-04-16",
                "delivery_count": 15,
                "status": "active",
            }
        ]
        self.source_clients.get_company_fleet_pricing_table.return_value = {
            "box_purchase_unit_price": "4700.00",
        }
        self.source_clients.bulk_lookup_attendance_days.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "attendance_date": "2026-04-16",
                "final_status": "day_off",
            }
        ]
        self.source_clients.list_driver_day_exceptions.return_value = []

        payload = self.service.build_driver_daily_settlements(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from=date(2026, 4, 1),
            date_to=date(2026, 4, 30),
            authorization="Bearer token",
        )

        self.assertEqual(payload["summary"]["regular_days"], 0)
        self.assertEqual(payload["summary"]["special_days"], 0)
        self.assertEqual(payload["summary"]["total_amount"], Decimal("0.00"))
        self.assertEqual(payload["results"], [])

    def test_build_driver_daily_settlements_returns_empty_window_without_snapshots(self):
        self.source_clients.list_driver_daily_snapshots.return_value = []

        payload = self.service.build_driver_daily_settlements(
            driver_id="10000000-0000-0000-0000-000000000001",
            date_from=date(2026, 4, 1),
            date_to=date(2026, 4, 30),
            authorization="Bearer token",
        )

        self.assertEqual(payload["summary"]["regular_days"], 0)
        self.assertEqual(payload["summary"]["special_days"], 0)
        self.assertEqual(payload["summary"]["total_amount"], Decimal("0.00"))
        self.assertEqual(payload["results"], [])
        self.source_clients.get_company_fleet_pricing_table.assert_not_called()

    def test_build_run_driver_amounts_aggregates_daily_rows_by_driver(self):
        self.source_clients.get_company_fleet_pricing_table.return_value = {
            "box_purchase_unit_price": "4700.00",
        }
        self.source_clients.list_active_daily_snapshots.return_value = [
            {
                "daily_delivery_input_snapshot_id": str(uuid4()),
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "service_date": "2026-04-16",
                "delivery_count": 10,
                "status": "active",
            },
            {
                "daily_delivery_input_snapshot_id": str(uuid4()),
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "service_date": "2026-04-17",
                "delivery_count": 12,
                "status": "active",
            },
        ]
        self.source_clients.bulk_lookup_attendance_days.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "attendance_date": "2026-04-16",
                "final_status": "worked",
            },
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "attendance_date": "2026-04-17",
                "final_status": "worked",
            },
        ]
        self.source_clients.list_driver_day_exceptions.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "dispatch_date": "2026-04-16",
                "work_rule": {"system_kind": "overtime"},
            }
        ]

        amounts = self.service.build_run_driver_amounts(
            company_id="30000000-0000-0000-0000-000000000001",
            fleet_id="40000000-0000-0000-0000-000000000001",
            period_start=date(2026, 4, 1),
            period_end=date(2026, 4, 30),
            authorization="Bearer token",
        )

        self.assertEqual(
            amounts,
            {"10000000-0000-0000-0000-000000000001": Decimal("103400.00")},
        )

    def test_build_run_driver_amounts_requires_attendance_truth(self):
        self.source_clients.get_company_fleet_pricing_table.return_value = {
            "box_purchase_unit_price": "4700.00",
        }
        self.source_clients.list_active_daily_snapshots.return_value = [
            {
                "daily_delivery_input_snapshot_id": str(uuid4()),
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "service_date": "2026-04-16",
                "delivery_count": 10,
                "status": "active",
            }
        ]
        self.source_clients.bulk_lookup_attendance_days.return_value = []
        self.source_clients.list_driver_day_exceptions.return_value = []

        with self.assertRaises(SourceNotFoundError):
            self.service.build_run_driver_amounts(
                company_id="30000000-0000-0000-0000-000000000001",
                fleet_id="40000000-0000-0000-0000-000000000001",
                period_start=date(2026, 4, 1),
                period_end=date(2026, 4, 30),
                authorization="Bearer token",
            )
