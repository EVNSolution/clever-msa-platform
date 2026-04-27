from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from telemetry.models import DiagnosticEvent, TelemetryRawIngest, TelemetryTimeseries, VehicleLocationSnapshot


class TelemetryApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin")
        self.user_token = self._issue_token("user")
        self.vehicle_id = uuid4()
        self.terminal_id = uuid4()

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

    def _ingest_payload(self):
        return {
            "source_terminal_id": str(self.terminal_id),
            "source_vehicle_id": str(self.vehicle_id),
            "message_topic": "vehicles/telemetry",
            "message_type": "location_update",
            "payload_json": {
                "captured_at": "2026-03-21T09:00:00Z",
                "lat": 37.5665,
                "lng": 126.9780,
                "speed": 42.5,
                "battery_soc": 81.2,
                "key_status": "on",
                "payload_version": "v1",
                "diagnostics": [
                    {
                        "event_code": "BAT_LOW",
                        "severity": "warning",
                        "event_message": "Battery is low.",
                        "event_status": "open",
                    }
                ],
            },
            "received_at": "2026-03-21T09:00:05Z",
        }

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_admin_can_ingest_raw_telemetry(self):
        self._authenticate(self.admin_token)

        response = self.client.post("/ingest/raw/", self._ingest_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("telemetry_raw_ingest_id", response.data)

    @override_settings(TELEMETRY_HUB_INGEST_KEY="shared-key")
    def test_internal_ingest_key_can_ingest_raw_telemetry_without_jwt(self):
        self.client.credentials(HTTP_X_TELEMETRY_INGEST_KEY="shared-key")

        response = self.client.post("/ingest/raw/", self._ingest_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("telemetry_raw_ingest_id", response.data)

    @override_settings(TELEMETRY_HUB_INGEST_KEY="shared-key")
    def test_invalid_internal_ingest_key_is_rejected_without_jwt(self):
        self.client.credentials(HTTP_X_TELEMETRY_INGEST_KEY="wrong-key")

        response = self.client.post("/ingest/raw/", self._ingest_payload(), format="json")

        self.assertEqual(response.status_code, 401)

    def test_ingest_persists_raw_when_nested_payload_cannot_be_normalized(self):
        self._authenticate(self.admin_token)
        payload = self._ingest_payload()
        payload["payload_json"] = {
            "lat": 37.5665,
            "lng": 126.9780,
            "diagnostics": [],
        }

        response = self.client.post("/ingest/raw/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(TelemetryRawIngest.objects.count(), 1)
        self.assertEqual(TelemetryTimeseries.objects.count(), 0)

    def test_user_cannot_ingest_but_can_read_latest_location(self):
        self._authenticate(self.admin_token)
        ingest_response = self.client.post("/ingest/raw/", self._ingest_payload(), format="json")
        self.assertEqual(ingest_response.status_code, 201)

        self._authenticate(self.user_token)
        latest_response = self.client.get(f"/vehicles/{self.vehicle_id}/latest-location/")
        write_response = self.client.post("/ingest/raw/", self._ingest_payload(), format="json")

        self.assertEqual(latest_response.status_code, 200)
        self.assertEqual(write_response.status_code, 403)

    def test_latest_vehicle_location_returns_snapshot(self):
        VehicleLocationSnapshot.objects.create(
            vehicle_id=self.vehicle_id,
            terminal_id=self.terminal_id,
            lat=37.5665,
            lng=126.9780,
            captured_at="2026-03-21T09:00:00Z",
            snapshot_status=VehicleLocationSnapshot.SnapshotStatus.FRESH,
        )
        self._authenticate(self.user_token)

        response = self.client.get(f"/vehicles/{self.vehicle_id}/latest-location/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["vehicle_id"]), str(self.vehicle_id))
        self.assertEqual(response.data["snapshot_status"], "fresh")

    def test_latest_vehicle_diagnostics_returns_events(self):
        DiagnosticEvent.objects.create(
            vehicle_id=self.vehicle_id,
            terminal_id=self.terminal_id,
            event_code="BAT_LOW",
            severity=DiagnosticEvent.Severity.WARNING,
            event_message="Battery is low.",
            captured_at="2026-03-21T09:00:00Z",
            event_status=DiagnosticEvent.EventStatus.OPEN,
        )
        self._authenticate(self.user_token)

        response = self.client.get(f"/vehicles/{self.vehicle_id}/latest-diagnostics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["event_code"], "BAT_LOW")
