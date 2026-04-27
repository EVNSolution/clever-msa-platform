from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from deadletters.models import TelemetryDeadLetter


@override_settings(
    TELEMETRY_DEAD_LETTER_PRODUCER_KEYS={
        "service-telemetry-listener": "listener-key",
    }
)
class TelemetryDeadLetterApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin")
        self.user_token = self._issue_token("user")

    def _issue_token(self, role: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": f"{role}-account",
            "email": f"{role}@example.com",
            "role": role,
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "jti": f"{role}-token",
            "type": "access",
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _ingest_payload(self, **overrides):
        payload = {
            "source_service": "service-telemetry-listener",
            "message_topic": "vehicles/telemetry",
            "source_terminal_id": None,
            "source_vehicle_id": None,
            "message_type": "location_update",
            "payload_json": {"raw": "payload"},
            "received_at": "2026-03-21T09:00:00Z",
            "failure_class": "parse_error",
            "error_message": "Payload parse failed.",
            "retry_attempts": 2,
            "failure_fingerprint": "fp-001",
            "failed_at": "2026-03-21T09:00:05Z",
        }
        payload.update(overrides)
        return payload

    def _create_dead_letter(self, **overrides) -> TelemetryDeadLetter:
        return TelemetryDeadLetter.objects.create(
            **{
                "source_service": "service-telemetry-listener",
                "message_topic": "vehicles/telemetry",
                "source_terminal_id": None,
                "source_vehicle_id": None,
                "message_type": "location_update",
                "payload_json": {"raw": "payload"},
                "received_at": datetime(2026, 3, 21, 9, 0, tzinfo=timezone.utc),
                "failure_class": TelemetryDeadLetter.FailureClass.PARSE_ERROR,
                "error_message": "Payload parse failed.",
                "retry_attempts": 2,
                "failure_fingerprint": "fp-001",
                "failed_at": datetime(2026, 3, 21, 9, 0, 5, tzinfo=timezone.utc),
                **overrides,
            }
        )

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_internal_ingest_accepts_valid_producer_key(self):
        self.client.credentials(HTTP_X_TELEMETRY_DEAD_LETTER_KEY="listener-key")

        response = self.client.post("/ingest/", self._ingest_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("telemetry_dead_letter_id", response.data)

    def test_internal_ingest_missing_source_service_is_validation_failure(self):
        self.client.credentials(HTTP_X_TELEMETRY_DEAD_LETTER_KEY="listener-key")

        response = self.client.post(
            "/ingest/",
            self._ingest_payload(source_service=None),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("source_service", response.data)

    def test_internal_ingest_rejects_mismatched_source_service(self):
        self.client.credentials(HTTP_X_TELEMETRY_DEAD_LETTER_KEY="listener-key")

        response = self.client.post(
            "/ingest/",
            self._ingest_payload(source_service="service-telemetry-hub"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("source_service", response.data)

    def test_internal_ingest_rejects_invalid_producer_key(self):
        self.client.credentials(HTTP_X_TELEMETRY_DEAD_LETTER_KEY="wrong-key")

        response = self.client.post("/ingest/", self._ingest_payload(), format="json")

        self.assertEqual(response.status_code, 401)

    def test_admin_jwt_can_list_and_detail_dead_letters(self):
        dead_letter = self._create_dead_letter()
        self._authenticate(self.admin_token)

        list_response = self.client.get("/")
        detail_response = self.client.get(f"/{dead_letter.telemetry_dead_letter_id}/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(list_response.data["count"], 1)
        self.assertEqual(
            detail_response.data["telemetry_dead_letter_id"],
            str(dead_letter.telemetry_dead_letter_id),
        )

    def test_non_admin_jwt_cannot_list_or_detail_dead_letters(self):
        dead_letter = self._create_dead_letter()
        self._authenticate(self.user_token)

        list_response = self.client.get("/")
        detail_response = self.client.get(f"/{dead_letter.telemetry_dead_letter_id}/")

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(detail_response.status_code, 403)

    def test_list_endpoint_uses_pagination_and_filters_by_defaults(self):
        older_record = self._create_dead_letter(
            failure_class=TelemetryDeadLetter.FailureClass.PARSE_ERROR,
            failure_fingerprint="fp-older",
            failed_at=datetime(2026, 3, 21, 8, 59, 0, tzinfo=timezone.utc),
        )
        newer_record = self._create_dead_letter(
            source_service="service-telemetry-hub",
            failure_class=TelemetryDeadLetter.FailureClass.HUB_4XX,
            failure_fingerprint="fp-newer",
            failed_at=datetime(2026, 3, 21, 9, 5, 0, tzinfo=timezone.utc),
        )
        self._authenticate(self.admin_token)

        response = self.client.get(
            "/",
            {
                "failure_class": TelemetryDeadLetter.FailureClass.HUB_4XX,
                "source_service": "service-telemetry-hub",
                "failed_at_from": "2026-03-21T09:01:00Z",
                "failed_at_to": "2026-03-21T09:06:00Z",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data.keys()), {"count", "next", "previous", "results"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(
            response.data["results"][0]["telemetry_dead_letter_id"],
            str(newer_record.telemetry_dead_letter_id),
        )
        self.assertNotEqual(
            response.data["results"][0]["telemetry_dead_letter_id"],
            str(older_record.telemetry_dead_letter_id),
        )
