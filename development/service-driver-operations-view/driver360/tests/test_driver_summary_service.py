from unittest import TestCase
from unittest.mock import patch

from django.test import override_settings
from rest_framework.exceptions import NotFound

from driver360.services.driver_summary_service import DriverSummaryService
from driver360.services.source_clients import SourceClients


class FakeSourceClients:
    def __init__(self, *, driver=None, companies=None, fleets=None, account=None, runs=None, items=None):
        self.driver = driver
        self.companies = companies if companies is not None else []
        self.fleets = fleets if fleets is not None else []
        self.account = account
        self.runs = runs if runs is not None else []
        self.items = items if items is not None else []

    def get_driver(self, *, driver_id, authorization):
        return self.driver

    def list_companies(self, *, authorization):
        return self.companies

    def list_fleets(self, *, authorization):
        return self.fleets

    def get_account(self, *, account_id, authorization):
        return self.account

    def list_settlement_runs(self, *, authorization):
        return self.runs

    def list_settlement_items(self, *, authorization):
        return self.items


class DriverSummaryServiceTests(TestCase):
    def setUp(self) -> None:
        self.driver = {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "account_id": "40000000-0000-0000-0000-000000000001",
            "company_id": "20000000-0000-0000-0000-000000000001",
            "fleet_id": "30000000-0000-0000-0000-000000000001",
            "name": "Kim Driver",
            "ev_id": "EV-001",
            "phone_number": "010-1234-5678",
            "address": "Seoul",
        }
        self.companies = [
            {"company_id": "20000000-0000-0000-0000-000000000001", "name": "EVN Company"},
        ]
        self.fleets = [
            {
                "fleet_id": "30000000-0000-0000-0000-000000000001",
                "company_id": "20000000-0000-0000-0000-000000000001",
                "name": "Central Fleet",
            },
        ]
        self.account = {
            "account_id": "40000000-0000-0000-0000-000000000001",
            "email": "driver@example.com",
            "role": "user",
            "is_active": True,
        }
        self.runs = [
            {
                "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                "company_id": "20000000-0000-0000-0000-000000000001",
                "fleet_id": "30000000-0000-0000-0000-000000000001",
                "period_start": "2026-02-01",
                "period_end": "2026-02-29",
                "status": "closed",
            },
            {
                "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                "company_id": "20000000-0000-0000-0000-000000000001",
                "fleet_id": "30000000-0000-0000-0000-000000000001",
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
                "status": "closed",
            },
        ]
        self.items = [
            {
                "settlement_item_id": "60000000-0000-0000-0000-000000000001",
                "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "amount": "100000.00",
                "payout_status": "paid",
            },
            {
                "settlement_item_id": "60000000-0000-0000-0000-000000000002",
                "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "amount": "125000.50",
                "payout_status": "pending",
            },
        ]

    def test_build_summary_with_linked_account_and_latest_settlement(self):
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=self.driver,
                companies=self.companies,
                fleets=self.fleets,
                account=self.account,
                runs=self.runs,
                items=self.items,
            )
        )

        summary = service.build_summary(
            driver_id=self.driver["driver_id"],
            authorization="Bearer token",
        )

        self.assertEqual(summary["driver_name"], "Kim Driver")
        self.assertEqual(summary["company_name"], "EVN Company")
        self.assertEqual(summary["fleet_name"], "Central Fleet")
        self.assertEqual(summary["account_email"], "driver@example.com")
        self.assertEqual(summary["latest_settlement_run_id"], "50000000-0000-0000-0000-000000000002")
        self.assertEqual(summary["latest_settlement_amount"], "125000.50")
        self.assertEqual(summary["latest_payout_status"], "pending")
        self.assertEqual(summary["warnings"], [])

    def test_build_summary_without_account_or_settlement(self):
        driver = {**self.driver, "account_id": None}
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=driver,
                companies=self.companies,
                fleets=self.fleets,
                account=None,
                runs=self.runs,
                items=[],
            )
        )

        summary = service.build_summary(
            driver_id=driver["driver_id"],
            authorization="Bearer token",
        )

        self.assertIsNone(summary["account_id"])
        self.assertIsNone(summary["account_email"])
        self.assertIsNone(summary["latest_settlement_run_id"])
        self.assertIsNone(summary["latest_settlement_amount"])
        self.assertEqual(summary["warnings"], [])

    def test_build_summary_adds_warnings_for_missing_org_and_account_lookup(self):
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=self.driver,
                companies=[],
                fleets=[],
                account=None,
                runs=[],
                items=[],
            )
        )

        summary = service.build_summary(
            driver_id=self.driver["driver_id"],
            authorization="Bearer token",
        )

        self.assertIsNone(summary["company_name"])
        self.assertIsNone(summary["fleet_name"])
        self.assertIsNone(summary["account_email"])
        self.assertEqual(
            summary["warnings"],
            [
                "Company not found for company_id=20000000-0000-0000-0000-000000000001.",
                "Fleet not found for fleet_id=30000000-0000-0000-0000-000000000001.",
                "Account not found for account_id=40000000-0000-0000-0000-000000000001.",
            ],
        )

    def test_build_summary_raises_not_found_when_driver_is_missing(self):
        service = DriverSummaryService(source_clients=FakeSourceClients(driver=None))

        with self.assertRaisesRegex(NotFound, "Driver not found."):
            service.build_summary(
                driver_id="10000000-0000-0000-0000-000000000001",
                authorization="Bearer token",
            )

    @override_settings(SETTLEMENT_OPS_BASE_URL="http://settlement-ops-api:8000")
    @patch("driver360.services.source_clients.urlopen")
    def test_settlement_sources_use_ops_base_url(self, mock_urlopen):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return b"[]"

        mock_urlopen.return_value = FakeResponse()

        clients = SourceClients()

        clients.list_settlement_runs(authorization="Bearer token")
        clients.list_settlement_items(authorization="Bearer token")

        self.assertEqual(mock_urlopen.call_count, 2)
        self.assertEqual(mock_urlopen.call_args_list[0].args[0].full_url, "http://settlement-ops-api:8000/runs/")
        self.assertEqual(mock_urlopen.call_args_list[1].args[0].full_url, "http://settlement-ops-api:8000/items/")
