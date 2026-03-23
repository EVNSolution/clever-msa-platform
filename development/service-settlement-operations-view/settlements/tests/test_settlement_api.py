from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from settlements.services import SourceNotFoundError


class SettlementApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.user_token = self._issue_token("user")

    def _issue_token(self, role: str) -> str:
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
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

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
