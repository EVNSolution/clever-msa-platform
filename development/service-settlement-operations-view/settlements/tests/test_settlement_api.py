from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from settlements.services import SourceNotFoundError, SourceServiceError


class SettlementApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.user_token = self._issue_token("user")
        self.admin_token = self._issue_token("admin")

    def _issue_token(self, role: str, allowed_nav_keys: list[str] | None = None) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(uuid4()),
            "email": f"{role}@example.com",
            "role": role,
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "jti": str(uuid4()),
            "type": "access",
        }
        if allowed_nav_keys is not None:
            payload["allowed_nav_keys"] = allowed_nav_keys
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _authenticate_admin_with_nav_keys(self, *allowed_nav_keys: str) -> None:
        self._authenticate(self._issue_token("admin", list(allowed_nav_keys)))

    def _run_payload(self):
        return {
            "settlement_run_id": str(uuid4()),
            "company_id": str(uuid4()),
            "fleet_id": str(uuid4()),
            "period_start": "2026-03-01",
            "period_end": "2026-03-31",
            "status": "draft",
        }

    def _item_payload(self, settlement_run_id: str):
        return {
            "settlement_item_id": str(uuid4()),
            "settlement_run_id": settlement_run_id,
            "driver_id": str(uuid4()),
            "amount": "125000.50",
            "payout_status": "pending",
        }

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    @patch("settlements.views.SourceClients")
    def test_user_can_read_settlement_resources_from_payroll_source(self, mock_source_clients):
        self._authenticate(self.user_token)
        run_payload = self._run_payload()
        item_payload = self._item_payload(run_payload["settlement_run_id"])
        mock_source_clients.return_value.list_settlement_runs.return_value = [run_payload]
        mock_source_clients.return_value.get_settlement_run.return_value = run_payload
        mock_source_clients.return_value.list_settlement_items.return_value = [item_payload]
        mock_source_clients.return_value.get_settlement_item.return_value = item_payload

        runs_response = self.client.get("/runs/")
        items_response = self.client.get("/items/")
        run_response = self.client.get(f"/runs/{run_payload['settlement_run_id']}/")
        item_response = self.client.get(f"/items/{item_payload['settlement_item_id']}/")

        self.assertEqual(runs_response.status_code, 200)
        self.assertEqual(items_response.status_code, 200)
        self.assertEqual(run_response.status_code, 200)
        self.assertEqual(item_response.status_code, 200)
        self.assertEqual(runs_response.data[0]["settlement_run_id"], run_payload["settlement_run_id"])
        self.assertEqual(items_response.data[0]["settlement_item_id"], item_payload["settlement_item_id"])
        self.assertEqual(
            mock_source_clients.return_value.list_settlement_runs.call_args.kwargs["authorization"],
            f"Bearer {self.user_token}",
        )
        self.assertEqual(
            mock_source_clients.return_value.list_settlement_items.call_args.kwargs["authorization"],
            f"Bearer {self.user_token}",
        )

    @patch("settlements.views.SourceClients")
    def test_user_can_filter_settlement_reads_by_company_and_fleet(self, mock_source_clients):
        self._authenticate(self.user_token)
        run_payload = self._run_payload()
        mock_source_clients.return_value.list_settlement_runs.return_value = [run_payload]
        mock_source_clients.return_value.list_settlement_items.return_value = [
            self._item_payload(run_payload["settlement_run_id"])
        ]

        runs_response = self.client.get(
            f"/runs/?company_id={run_payload['company_id']}&fleet_id={run_payload['fleet_id']}"
        )
        items_response = self.client.get(
            f"/items/?company_id={run_payload['company_id']}&fleet_id={run_payload['fleet_id']}"
        )

        self.assertEqual(runs_response.status_code, 200)
        self.assertEqual(items_response.status_code, 200)
        self.assertEqual(
            mock_source_clients.return_value.list_settlement_runs.call_args.kwargs["company_id"],
            run_payload["company_id"],
        )
        self.assertEqual(
            mock_source_clients.return_value.list_settlement_runs.call_args.kwargs["fleet_id"],
            run_payload["fleet_id"],
        )
        self.assertEqual(
            mock_source_clients.return_value.list_settlement_items.call_args.kwargs["company_id"],
            run_payload["company_id"],
        )
        self.assertEqual(
            mock_source_clients.return_value.list_settlement_items.call_args.kwargs["fleet_id"],
            run_payload["fleet_id"],
        )

    def test_write_methods_are_not_available_on_settlement_resources(self):
        self._authenticate(self.user_token)
        run_payload = self._run_payload()
        item_payload = self._item_payload(run_payload["settlement_run_id"])
        run_id = uuid4()
        item_id = uuid4()

        run_create_response = self.client.post("/runs/", run_payload, format="json")
        item_create_response = self.client.post("/items/", item_payload, format="json")
        run_patch_response = self.client.patch(f"/runs/{run_id}/", {"status": "closed"}, format="json")
        item_delete_response = self.client.delete(f"/items/{item_id}/")

        self.assertEqual(run_create_response.status_code, 405)
        self.assertEqual(item_create_response.status_code, 405)
        self.assertEqual(run_patch_response.status_code, 405)
        self.assertEqual(item_delete_response.status_code, 405)

    @patch("settlements.views.LatestSettlementSummaryService")
    def test_user_can_read_latest_settlement_for_driver(self, mock_service):
        self._authenticate(self.user_token)
        driver_id = "10000000-0000-0000-0000-000000000001"
        mock_service.return_value.build_summary.return_value = {
            "delivery_history_present": True,
            "attendance_inferred_from_delivery_history": True,
            "latest_settlement": {
                "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
                "status": "closed",
                "payout_status": "pending",
                "amount": "125000.50",
            },
        }

        response = self.client.get(f"/drivers/{driver_id}/latest-settlement/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["driver_id"], driver_id)
        self.assertTrue(response.data["delivery_history_present"])
        self.assertTrue(response.data["attendance_inferred_from_delivery_history"])
        self.assertEqual(response.data["latest_settlement"]["amount"], "125000.50")
        self.assertEqual(
            mock_service.return_value.build_summary.call_args.kwargs["authorization"],
            f"Bearer {self.user_token}",
        )

    @patch("settlements.views.LatestSettlementSummaryService")
    def test_driver_with_no_settlement_returns_null_summary(self, mock_service):
        self._authenticate(self.user_token)
        driver_id = "10000000-0000-0000-0000-000000000099"
        mock_service.return_value.build_summary.return_value = {
            "delivery_history_present": False,
            "attendance_inferred_from_delivery_history": False,
            "latest_settlement": None,
        }

        response = self.client.get(f"/drivers/{driver_id}/latest-settlement/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["driver_id"], driver_id)
        self.assertFalse(response.data["delivery_history_present"])
        self.assertFalse(response.data["attendance_inferred_from_delivery_history"])
        self.assertIsNone(response.data["latest_settlement"])

    @patch("settlements.views.PagedLatestSettlementSummaryService")
    def test_user_can_read_latest_settlement_page_for_drivers(self, mock_service):
        self._authenticate(self.user_token)
        mock_service.return_value.build_page.return_value = {
            "count": 27,
            "page": 2,
            "page_size": 10,
            "results": [
                {
                    "driver_id": "10000000-0000-0000-0000-000000000011",
                    "driver_name": "Driver 11",
                    "delivery_history_present": True,
                    "attendance_inferred_from_delivery_history": True,
                    "latest_settlement": {
                        "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                        "period_start": "2026-04-01",
                        "period_end": "2026-04-30",
                        "status": "reviewed",
                        "payout_status": "pending",
                        "amount": "125000.50",
                    },
                }
            ],
        }

        response = self.client.get(
            "/drivers/latest-settlements/",
            {
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "page": 2,
                "page_size": 10,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 27)
        self.assertEqual(response.data["page"], 2)
        self.assertEqual(response.data["page_size"], 10)
        self.assertEqual(response.data["results"][0]["driver_name"], "Driver 11")
        self.assertEqual(
            mock_service.return_value.build_page.call_args.kwargs,
            {
                "authorization": f"Bearer {self.user_token}",
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "page": 2,
                "page_size": 10,
            },
        )

    @patch("settlements.views.LatestSettlementSummaryService")
    def test_latest_settlement_outage_returns_503_shape(self, mock_service):
        self._authenticate(self.user_token)
        mock_service.return_value.build_summary.side_effect = SourceServiceError("unavailable")

        response = self.client.get("/drivers/10000000-0000-0000-0000-000000000001/latest-settlement/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "upstream_service_unavailable")
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_placeholder_routes_do_not_expose_legacy_settlement_engine_endpoints(self):
        self._authenticate(self.user_token)

        for path in (
            "/daily-settlement/",
            "/monthly-settlement/",
            "/group-settlement/",
            "/settlement-policy/",
        ):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)

    def test_unauthenticated_read_returns_401_shape(self):
        response = self.client.get("/runs/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_missing_resource_returns_404_shape(self):
        self._authenticate(self.user_token)

        with patch("settlements.views.SourceClients") as mock_source_clients:
            mock_source_clients.return_value.get_settlement_run.side_effect = SourceNotFoundError("missing")
            response = self.client.get(f"/runs/{uuid4()}/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_upstream_payroll_outage_returns_503_dependency_error_shape(self):
        self._authenticate(self.user_token)

        with patch("settlements.views.SourceClients") as mock_source_clients:
            mock_source_clients.return_value.list_settlement_runs.side_effect = SourceServiceError("unavailable")
            response = self.client.get("/runs/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "upstream_service_unavailable")
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_malformed_upstream_payload_returns_502_dependency_error_shape(self):
        self._authenticate(self.user_token)

        with patch("settlements.views.SourceClients") as mock_source_clients:
            mock_source_clients.return_value.list_settlement_runs.return_value = [
                {
                    "settlement_run_id": str(uuid4()),
                    "company_id": "not-a-uuid",
                    "fleet_id": str(uuid4()),
                    "period_start": "2026-03-01",
                    "period_end": "2026-03-31",
                    "status": "draft",
                }
            ]
            response = self.client.get("/runs/")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["code"], "upstream_invalid_response")
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_without_settlements_nav_key_is_denied(self):
        self._authenticate_admin_with_nav_keys("dispatch")

        self.assertEqual(self.client.get("/runs/").status_code, 403)
        self.assertEqual(self.client.get("/items/").status_code, 403)

    def test_admin_with_settlements_nav_key_can_read_resources(self):
        self._authenticate_admin_with_nav_keys("settlements")

        with patch("settlements.views.SourceClients") as mock_source_clients:
            mock_source_clients.return_value.list_settlement_runs.return_value = []
            mock_source_clients.return_value.list_settlement_items.return_value = []

            self.assertEqual(self.client.get("/runs/").status_code, 200)
            self.assertEqual(self.client.get("/items/").status_code, 200)

    @patch("settlements.views.DailySettlementReadService")
    def test_user_can_read_driver_daily_settlements(self, mock_service):
        self._authenticate(self.user_token)
        mock_service.return_value.build_daily_settlements.return_value = {
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
                    "daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000001",
                    "settlement_type": "regular",
                    "box_count": 12,
                    "unit_price": "4700.00",
                    "total_amount": "56400.00",
                }
            ],
        }

        response = self.client.get(
            "/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["regular_days"], 1)
        self.assertEqual(
            response.data["results"][0]["daily_delivery_input_snapshot_id"],
            "20000000-0000-0000-0000-000000000001",
        )

    @patch("settlements.views.DailySettlementReadService")
    def test_driver_daily_settlements_reject_invalid_date_window(self, mock_service):
        self._authenticate(self.user_token)

        response = self.client.get(
            "/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-30&date_to=2026-04-01"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("date_to", response.data["details"])
        mock_service.assert_not_called()

    @patch("settlements.views.DailySettlementReadService")
    def test_driver_daily_settlements_maps_dependency_outage_to_503(self, mock_service):
        self._authenticate(self.user_token)
        mock_service.return_value.build_daily_settlements.side_effect = SourceServiceError("unavailable")

        response = self.client.get(
            "/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30"
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "upstream_service_unavailable")

    @patch("settlements.views.DailySettlementReadService")
    def test_driver_daily_settlements_requires_settlements_nav_for_admin(self, mock_service):
        self._authenticate_admin_with_nav_keys("dispatch")

        response = self.client.get(
            "/drivers/10000000-0000-0000-0000-000000000001/daily-settlements/?date_from=2026-04-01&date_to=2026-04-30"
        )

        self.assertEqual(response.status_code, 403)
        mock_service.assert_not_called()
