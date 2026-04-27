from django.test import TestCase

from settlements.services.paged_latest_settlement_service import PagedLatestSettlementSummaryService
from settlements.services.source_clients import SourceServiceError


class FakeSourceClients:
    def __init__(self, *, drivers, runs, items, delivery_records_by_driver=None, delivery_records_error_ids=None):
        self.drivers = drivers
        self.runs = runs
        self.items = items
        self.delivery_records_by_driver = delivery_records_by_driver or {}
        self.delivery_records_error_ids = set(delivery_records_error_ids or [])

    def list_drivers(self, **kwargs):
        self.list_drivers_kwargs = kwargs
        return self.drivers

    def list_settlement_runs(self, **kwargs):
        self.list_settlement_runs_called = True
        self.list_settlement_runs_kwargs = kwargs
        return self.runs

    def list_settlement_items(self, **kwargs):
        self.list_settlement_items_called = True
        self.list_settlement_items_kwargs = kwargs
        return self.items

    def list_delivery_records(self, *, driver_id: str, status: str, authorization: str):
        if driver_id in self.delivery_records_error_ids:
            raise SourceServiceError("delivery-record unavailable")
        return self.delivery_records_by_driver.get(driver_id, [])


class PagedLatestSettlementSummaryServiceTests(TestCase):
    def test_build_page_returns_count_and_latest_summary_for_each_driver(self):
        service = PagedLatestSettlementSummaryService(
            source_clients=FakeSourceClients(
                drivers={
                    "count": 12,
                    "page": 2,
                    "page_size": 10,
                    "results": [
                        {
                            "driver_id": "10000000-0000-0000-0000-000000000011",
                            "name": "Driver 11",
                        },
                        {
                            "driver_id": "10000000-0000-0000-0000-000000000012",
                            "name": "Driver 12",
                        },
                    ],
                },
                runs=[
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "closed",
                    },
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "period_start": "2026-04-01",
                        "period_end": "2026-04-30",
                        "status": "reviewed",
                    },
                ],
                items=[
                    {
                        "settlement_item_id": "60000000-0000-0000-0000-000000000001",
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "driver_id": "10000000-0000-0000-0000-000000000011",
                        "amount": "100000.00",
                        "payout_status": "paid",
                    },
                    {
                        "settlement_item_id": "60000000-0000-0000-0000-000000000002",
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "driver_id": "10000000-0000-0000-0000-000000000011",
                        "amount": "125000.50",
                        "payout_status": "pending",
                    },
                ],
                delivery_records_by_driver={
                    "10000000-0000-0000-0000-000000000011": [{"delivery_record_id": "record-1"}],
                    "10000000-0000-0000-0000-000000000012": [],
                },
            )
        )

        payload = service.build_page(
            authorization="Bearer token",
            company_id="30000000-0000-0000-0000-000000000001",
            fleet_id="40000000-0000-0000-0000-000000000001",
            page=2,
            page_size=10,
        )

        self.assertEqual(payload["count"], 12)
        self.assertEqual(payload["page"], 2)
        self.assertEqual(payload["page_size"], 10)
        self.assertEqual(len(payload["results"]), 2)
        self.assertEqual(payload["results"][0]["driver_name"], "Driver 11")
        self.assertEqual(
            payload["results"][0]["latest_settlement"]["settlement_run_id"],
            "50000000-0000-0000-0000-000000000002",
        )
        self.assertTrue(payload["results"][0]["delivery_history_present"])
        self.assertFalse(payload["results"][1]["delivery_history_present"])
        self.assertIsNone(payload["results"][1]["latest_settlement"])

    def test_build_page_returns_nullable_delivery_flags_when_delivery_source_fails(self):
        service = PagedLatestSettlementSummaryService(
            source_clients=FakeSourceClients(
                drivers={
                    "count": 1,
                    "page": 1,
                    "page_size": 10,
                    "results": [
                        {
                            "driver_id": "10000000-0000-0000-0000-000000000011",
                            "name": "Driver 11",
                        }
                    ],
                },
                runs=[],
                items=[],
                delivery_records_error_ids={"10000000-0000-0000-0000-000000000011"},
            )
        )

        payload = service.build_page(authorization="Bearer token", page=1, page_size=10)

        self.assertEqual(payload["results"][0]["driver_name"], "Driver 11")
        self.assertIsNone(payload["results"][0]["delivery_history_present"])
        self.assertIsNone(payload["results"][0]["attendance_inferred_from_delivery_history"])

    def test_build_page_skips_run_and_item_reads_when_driver_page_is_empty(self):
        fake_clients = FakeSourceClients(
            drivers={
                "count": 0,
                "page": 1,
                "page_size": 10,
                "results": [],
            },
            runs=[],
            items=[],
        )
        service = PagedLatestSettlementSummaryService(source_clients=fake_clients)

        payload = service.build_page(authorization="Bearer token", page=1, page_size=10)

        self.assertEqual(payload, {"count": 0, "page": 1, "page_size": 10, "results": []})
        self.assertFalse(hasattr(fake_clients, "list_settlement_runs_called"))
        self.assertFalse(hasattr(fake_clients, "list_settlement_items_called"))
