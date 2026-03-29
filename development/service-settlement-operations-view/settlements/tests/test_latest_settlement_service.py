from django.test import TestCase

from settlements.services.latest_settlement_service import LatestSettlementSummaryService
from settlements.services.source_clients import SourceServiceError


class FakeSourceClients:
    def __init__(self, *, runs, items, delivery_records=None, delivery_records_error=False):
        self.runs = runs
        self.items = items
        self.delivery_records = delivery_records if delivery_records is not None else []
        self.delivery_records_error = delivery_records_error
        self.run_authorization = None
        self.item_authorization = None
        self.delivery_record_authorization = None

    def list_settlement_runs(self, *, authorization: str):
        self.run_authorization = authorization
        return self.runs

    def list_settlement_items(self, *, authorization: str):
        self.item_authorization = authorization
        return self.items

    def list_delivery_records(self, *, driver_id: str, status: str, authorization: str):
        self.delivery_record_authorization = authorization
        if self.delivery_records_error:
            raise SourceServiceError("delivery-record unavailable")
        return self.delivery_records


class LatestSettlementSummaryServiceTests(TestCase):
    def test_build_summary_returns_latest_match_for_driver(self):
        service = LatestSettlementSummaryService(
            source_clients=FakeSourceClients(
                runs=[
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "period_start": "2026-02-01",
                        "period_end": "2026-02-28",
                        "status": "closed",
                    },
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "closed",
                    },
                ],
                items=[
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
                    {
                        "settlement_item_id": "60000000-0000-0000-0000-000000000003",
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "driver_id": "10000000-0000-0000-0000-000000000099",
                        "amount": "222000.00",
                        "payout_status": "pending",
                    },
                ],
                delivery_records=[
                    {
                        "delivery_record_id": "70000000-0000-0000-0000-000000000001",
                        "driver_id": "10000000-0000-0000-0000-000000000001",
                    }
                ],
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertTrue(summary["delivery_history_present"])
        self.assertTrue(summary["attendance_inferred_from_delivery_history"])
        self.assertEqual(summary["latest_settlement"]["settlement_run_id"], "50000000-0000-0000-0000-000000000002")
        self.assertEqual(summary["latest_settlement"]["period_start"], "2026-03-01")
        self.assertEqual(summary["latest_settlement"]["period_end"], "2026-03-31")
        self.assertEqual(summary["latest_settlement"]["status"], "closed")
        self.assertEqual(summary["latest_settlement"]["payout_status"], "pending")
        self.assertEqual(summary["latest_settlement"]["amount"], "125000.50")

    def test_build_summary_returns_none_when_driver_has_no_settlement(self):
        service = LatestSettlementSummaryService(
            source_clients=FakeSourceClients(
                runs=[
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "closed",
                    }
                ],
                items=[
                    {
                        "settlement_item_id": "60000000-0000-0000-0000-000000000002",
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "driver_id": "10000000-0000-0000-0000-000000000099",
                        "amount": "125000.50",
                        "payout_status": "pending",
                    }
                ],
                delivery_records=[],
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertFalse(summary["delivery_history_present"])
        self.assertFalse(summary["attendance_inferred_from_delivery_history"])
        self.assertIsNone(summary["latest_settlement"])

    def test_build_summary_uses_settlement_run_id_as_tie_breaker(self):
        service = LatestSettlementSummaryService(
            source_clients=FakeSourceClients(
                runs=[
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "closed",
                    },
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "draft",
                    },
                ],
                items=[
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
                ],
                delivery_records=[
                    {
                        "delivery_record_id": "70000000-0000-0000-0000-000000000001",
                        "driver_id": "10000000-0000-0000-0000-000000000001",
                    }
                ],
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertEqual(summary["latest_settlement"]["settlement_run_id"], "50000000-0000-0000-0000-000000000002")
        self.assertEqual(summary["latest_settlement"]["status"], "draft")

    def test_build_summary_returns_nullable_delivery_flags_when_delivery_source_is_unavailable(self):
        service = LatestSettlementSummaryService(
            source_clients=FakeSourceClients(
                runs=[
                    {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "closed",
                    }
                ],
                items=[
                    {
                        "settlement_item_id": "60000000-0000-0000-0000-000000000001",
                        "settlement_run_id": "50000000-0000-0000-0000-000000000001",
                        "driver_id": "10000000-0000-0000-0000-000000000001",
                        "amount": "100000.00",
                        "payout_status": "paid",
                    }
                ],
                delivery_records_error=True,
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertIsNone(summary["delivery_history_present"])
        self.assertIsNone(summary["attendance_inferred_from_delivery_history"])
        self.assertEqual(summary["latest_settlement"]["settlement_run_id"], "50000000-0000-0000-0000-000000000001")
