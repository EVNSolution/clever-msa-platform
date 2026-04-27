from datetime import timedelta
from unittest.mock import Mock

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from deadletters.models import TelemetryDeadLetter


@override_settings(
    TELEMETRY_DEAD_LETTER_MAX_PAYLOAD_BYTES=32,
    TELEMETRY_DEAD_LETTER_RETENTION_DAYS=30,
    TELEMETRY_DEAD_LETTER_PRODUCER_KEYS={
        "service-telemetry-listener": "listener-key",
    },
)
class TelemetryDeadLetterRetentionTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.client.credentials(HTTP_X_TELEMETRY_DEAD_LETTER_KEY="listener-key")

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
        defaults = {
            "source_service": "service-telemetry-listener",
            "message_topic": "vehicles/telemetry",
            "source_terminal_id": None,
            "source_vehicle_id": None,
            "message_type": "location_update",
            "payload_json": {"raw": "payload"},
            "received_at": timezone.now(),
            "failure_class": TelemetryDeadLetter.FailureClass.PARSE_ERROR,
            "error_message": "Payload parse failed.",
            "retry_attempts": 2,
            "failure_fingerprint": "fp-001",
            "failed_at": timezone.now(),
        }
        defaults.update(overrides)
        return TelemetryDeadLetter.objects.create(**defaults)

    def test_internal_ingest_rejects_payload_over_max_payload_bytes(self):
        response = self.client.post(
            "/ingest/",
            self._ingest_payload(payload_json={"raw": "x" * 128}),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("payload_json", response.data)

    def test_prune_dead_letters_deletes_records_older_than_retention_window(self):
        old_dead_letter = self._create_dead_letter(
            failed_at=timezone.now() - timedelta(days=31),
            failure_fingerprint="fp-old",
        )
        recent_dead_letter = self._create_dead_letter(
            failed_at=timezone.now() - timedelta(days=5),
            failure_fingerprint="fp-recent",
        )

        call_command("prune_dead_letters", stdout=Mock())

        self.assertFalse(TelemetryDeadLetter.objects.filter(pk=old_dead_letter.pk).exists())
        self.assertTrue(TelemetryDeadLetter.objects.filter(pk=recent_dead_letter.pk).exists())
