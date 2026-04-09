from unittest.mock import patch
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.exceptions import NotFound
from rest_framework.test import APIClient


class Driver360ApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.token = self._issue_token()
        self.summary = {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "driver_name": "Kim Driver",
            "ev_id": "EV-001",
            "phone_number": "010-1234-5678",
            "address": "Seoul",
            "company_id": "20000000-0000-0000-0000-000000000001",
            "company_name": "EVN Company",
            "fleet_id": "30000000-0000-0000-0000-000000000001",
            "fleet_name": "Central Fleet",
            "employment_status": "active",
            "qualification_status": "qualified",
            "driver_account_link_id": "41000000-0000-0000-0000-000000000001",
            "driver_account_id": "40000000-0000-0000-0000-000000000001",
            "driver_account_identity_name": "Kim Driver",
            "driver_account_email": "driver@example.com",
            "driver_account_status": "active",
            "latest_settlement_run_id": "50000000-0000-0000-0000-000000000001",
            "latest_settlement_period_start": "2026-03-01",
            "latest_settlement_period_end": "2026-03-31",
            "latest_settlement_status": "closed",
            "latest_payout_status": "paid",
            "latest_settlement_amount": "125000.50",
            "driver_cleanup_status": "ready",
            "cleanup_blockers": [],
            "active_personnel_document_types": [
                "bank_account_proof",
                "business_registration",
                "contract",
                "license_or_certificate",
            ],
            "missing_personnel_document_types": [],
            "attendance_rule_status": "pending_source",
            "delivery_history_rule_status": "source_input_only",
            "warnings": [],
        }

    def _issue_token(self, role: str = "user", allowed_nav_keys: list[str] | None = None) -> str:
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

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    @patch("driver360.views.DriverSummaryService.build_summary")
    def test_detail_endpoint_returns_summary_contract(self, mock_build_summary):
        mock_build_summary.return_value = self.summary
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        driver_ref = "1"
        response = self.client.get(f"/drivers/{driver_ref}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["driver_name"], "Kim Driver")
        self.assertEqual(response.data["company_name"], "EVN Company")
        self.assertEqual(response.data["employment_status"], "active")
        self.assertEqual(response.data["qualification_status"], "qualified")
        self.assertEqual(response.data["driver_account_email"], "driver@example.com")
        self.assertEqual(response.data["latest_settlement_amount"], "125000.50")
        self.assertEqual(response.data["driver_cleanup_status"], "ready")
        mock_build_summary.assert_called_once_with(
            driver_ref=driver_ref,
            authorization=f"Bearer {self.token}",
        )

    @patch("driver360.views.DriverSummaryService.build_summary", side_effect=NotFound("Driver not found."))
    def test_detail_endpoint_returns_404_shape_when_driver_missing(self, _mock_build_summary):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/drivers/999999/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_without_drivers_nav_key_is_denied(self):
        token = self._issue_token(role="admin", allowed_nav_keys=["vehicles"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/drivers/1/")

        self.assertEqual(response.status_code, 403)

    @patch("driver360.views.DriverSummaryService.build_summary")
    def test_admin_with_drivers_nav_key_can_read(self, mock_build_summary):
        mock_build_summary.return_value = self.summary
        token = self._issue_token(role="admin", allowed_nav_keys=["drivers"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/drivers/1/")

        self.assertEqual(response.status_code, 200)
