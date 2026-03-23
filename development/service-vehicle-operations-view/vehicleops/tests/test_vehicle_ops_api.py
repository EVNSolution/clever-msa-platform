from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.exceptions import NotFound
from rest_framework.test import APIClient
from unittest.mock import patch


class VehicleOpsApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.token = self._issue_token()
        self.summary = {
            "vehicle_id": "11111111-1111-1111-1111-111111111111",
            "plate_number": "12가3456",
            "vin": "KMH00000000000001",
            "vehicle_status": "active",
            "manufacturer_company": {
                "company_id": "22222222-2222-2222-2222-222222222222",
                "company_name": "Manufacturer Co",
            },
            "active_operator_company": {
                "company_id": "33333333-3333-3333-3333-333333333333",
                "company_name": "Operator Co",
                "access_status": "active",
            },
            "current_assignment": {
                "driver_vehicle_assignment_id": "60000000-0000-0000-0000-000000000001",
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "assignment_status": "assigned",
                "assigned_at": "2026-03-20T10:00:00Z",
            },
            "current_terminal": {
                "terminal_id": "70000000-0000-0000-0000-000000000001",
                "installation_status": "installed",
                "installed_at": "2026-03-20T09:55:00Z",
                "imei": "356123456789012",
                "iccid": "8982123412341234123",
                "firmware_version": "1.0.0",
                "protocol_version": "2.1",
                "app_version": "3.4.5",
            },
            "telemetry": {
                "latest_location": {
                    "lat": 37.5665,
                    "lng": 126.9780,
                    "captured_at": "2026-03-20T10:05:00Z",
                    "snapshot_status": "fresh",
                },
                "latest_diagnostic": {
                    "event_code": "BAT_LOW",
                    "severity": "warning",
                    "event_status": "open",
                    "captured_at": "2026-03-20T10:04:00Z",
                },
            },
            "warnings": [],
        }

    def _issue_token(self, include_sub: bool = True) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "email": "user@example.com",
            "role": "user",
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "jti": str(uuid4()),
            "type": "access",
        }
        if include_sub:
            payload["sub"] = str(uuid4())
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_unauthenticated_list_returns_401(self):
        response = self.client.get("/vehicles/")

        self.assertEqual(response.status_code, 401)

    @patch("vehicleops.authentication.get_authorization_header", return_value=b"Bearer \xff")
    def test_non_utf8_authorization_header_returns_401(self, _mock_header):
        response = self.client.get("/vehicles/")

        self.assertEqual(response.status_code, 401)

    def test_malformed_authorization_header_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Basic invalid")

        response = self.client.get("/vehicles/")

        self.assertEqual(response.status_code, 401)

    def test_token_missing_sub_returns_401(self):
        token = self._issue_token(include_sub=False)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/vehicles/")

        self.assertEqual(response.status_code, 401)

    @patch("vehicleops.views.VehicleSummaryService.list_summaries")
    def test_authenticated_list_returns_summary_array(self, mock_list_summaries):
        mock_list_summaries.return_value = [self.summary]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/vehicles/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [self.summary])
        mock_list_summaries.assert_called_once_with(authorization=f"Bearer {self.token}")

    @patch("vehicleops.views.VehicleSummaryService.build_summary")
    def test_authenticated_detail_returns_summary_contract(self, mock_get_summary):
        mock_get_summary.return_value = self.summary
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        vehicle_id = uuid4()

        response = self.client.get(f"/vehicles/{vehicle_id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, self.summary)
        mock_get_summary.assert_called_once_with(
            vehicle_id=str(vehicle_id),
            authorization=f"Bearer {self.token}",
        )

    @patch("vehicleops.views.VehicleSummaryService.build_summary", side_effect=NotFound("Vehicle not found."))
    def test_detail_endpoint_returns_404_envelope_when_summary_missing(self, _mock_get_summary):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get(f"/vehicles/{uuid4()}/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertEqual(response.data["code"], "not_found")
