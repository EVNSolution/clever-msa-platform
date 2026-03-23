from django.test import TestCase

from settlements.services.latest_settlement_service import LatestSettlementSummaryService


class FakeSourceClients:
    def __init__(self, *, runs, items):
        self.runs = runs
        self.items = items
        self.run_authorization = None
        self.item_authorization = None

    def list_settlement_runs(self, *, authorization: str):
        self.run_authorization = authorization
        return self.runs

    def list_settlement_items(self, *, authorization: str):
        self.item_authorization = authorization
        return self.items


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
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertEqual(summary["settlement_run_id"], "50000000-0000-0000-0000-000000000002")
        self.assertEqual(summary["period_start"], "2026-03-01")
        self.assertEqual(summary["period_end"], "2026-03-31")
        self.assertEqual(summary["status"], "closed")
        self.assertEqual(summary["payout_status"], "pending")
        self.assertEqual(summary["amount"], "125000.50")

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
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertIsNone(summary)

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
            )
        )

        summary = service.build_summary(
            driver_id="10000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        self.assertEqual(summary["settlement_run_id"], "50000000-0000-0000-0000-000000000002")
        self.assertEqual(summary["status"], "draft")
