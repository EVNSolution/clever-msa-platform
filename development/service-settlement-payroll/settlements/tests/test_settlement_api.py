from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.db import IntegrityError
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient


class SettlementApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin")
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
            "company_id": str(uuid4()),
            "fleet_id": str(uuid4()),
            "period_start": "2026-03-01",
            "period_end": "2026-03-31",
            "status": "draft",
        }

    def _item_payload(self, settlement_run_id: str):
        return {
            "settlement_run_id": settlement_run_id,
            "driver_id": str(uuid4()),
            "amount": "125000.50",
            "payout_status": "pending",
        }

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    def test_admin_can_crud_settlement_run_and_item(self):
        self._authenticate(self.admin_token)

        run_response = self.client.post("/runs/", self._run_payload(), format="json")
        self.assertEqual(run_response.status_code, 201)
        settlement_run_id = run_response.data["settlement_run_id"]

        item_response = self.client.post(
            "/items/",
            self._item_payload(settlement_run_id),
            format="json",
        )
        self.assertEqual(item_response.status_code, 201)
        settlement_item_id = item_response.data["settlement_item_id"]

        self.assertEqual(self.client.get(f"/runs/{settlement_run_id}/").status_code, 200)
        self.assertEqual(self.client.get(f"/items/{settlement_item_id}/").status_code, 200)
        self.assertEqual(
            self.client.patch(
                f"/runs/{settlement_run_id}/",
                {"status": "closed"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(
                f"/items/{settlement_item_id}/",
                {"payout_status": "paid"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(self.client.delete(f"/items/{settlement_item_id}/").status_code, 204)
        self.assertEqual(self.client.delete(f"/runs/{settlement_run_id}/").status_code, 204)

    def test_admin_cannot_create_settlement_run_with_invalid_status(self):
        self._authenticate(self.admin_token)

        payload = self._run_payload()
        payload["status"] = "processing"

        response = self.client.post("/runs/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("status", response.data["details"])

    def test_user_can_read_settlement_resources(self):
        self._authenticate(self.admin_token)
        self.assertEqual(self.client.post("/runs/", self._run_payload(), format="json").status_code, 201)

        self._authenticate(self.user_token)

        runs_response = self.client.get("/runs/")
        items_response = self.client.get("/items/")

        self.assertEqual(runs_response.status_code, 200)
        self.assertEqual(items_response.status_code, 200)

    def test_user_cannot_write_settlement_resources(self):
        self._authenticate(self.user_token)

        run_response = self.client.post("/runs/", self._run_payload(), format="json")
        item_response = self.client.post("/items/", self._item_payload(str(uuid4())), format="json")

        self.assertEqual(run_response.status_code, 403)
        self.assertEqual(set(run_response.data.keys()), {"code", "message", "details"})
        self.assertEqual(item_response.status_code, 403)
        self.assertEqual(set(item_response.data.keys()), {"code", "message", "details"})

    def test_placeholder_routes_do_not_expose_legacy_settlement_engine_endpoints(self):
        self._authenticate(self.admin_token)

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
        self._authenticate(self.admin_token)

        response = self.client.get(f"/runs/{uuid4()}/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})


class SettlementItemDatabaseConstraintTests(TransactionTestCase):
    reset_sequences = True

    def test_settlement_item_requires_an_existing_settlement_run_at_the_database_layer(self):
        with self.assertRaises(IntegrityError):
            from settlements.models import SettlementItem

            SettlementItem.objects.create(
                settlement_run_id=uuid4(),
                driver_id=uuid4(),
                amount="125000.50",
                payout_status="pending",
            )
