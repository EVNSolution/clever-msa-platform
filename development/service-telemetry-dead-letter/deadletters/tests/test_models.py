from datetime import datetime, timezone

from django.core.exceptions import ValidationError
from django.test import TestCase

from deadletters.models import TelemetryDeadLetter


class TelemetryDeadLetterModelTests(TestCase):
    def _record_data(self, **overrides):
        payload = {
            "source_service": "service-telemetry-listener",
            "message_topic": "vehicles/telemetry",
            "source_terminal_id": None,
            "source_vehicle_id": None,
            "message_type": "location_update",
            "payload_json": {"lat": 37.5665, "lng": 126.9780},
            "received_at": datetime(2026, 3, 21, 9, 0, tzinfo=timezone.utc),
            "failure_class": TelemetryDeadLetter.FailureClass.PARSE_ERROR,
            "error_message": "Payload parse failed.",
            "retry_attempts": 0,
            "failure_fingerprint": "fingerprint-001",
            "failed_at": datetime(2026, 3, 21, 9, 1, tzinfo=timezone.utc),
        }
        payload.update(overrides)
        return payload

    def _record(self, **overrides):
        return TelemetryDeadLetter(**self._record_data(**overrides))

    def test_dead_letter_is_append_only_after_create(self):
        dead_letter = TelemetryDeadLetter.objects.create(**self._record_data())

        dead_letter.error_message = "Mutated after create."

        with self.assertRaises(ValidationError):
            dead_letter.save()

        with self.assertRaises(ValidationError):
            dead_letter.delete()

    def test_required_fields_are_enforced(self):
        required_fields = (
            "source_service",
            "message_topic",
            "payload_json",
            "received_at",
            "failure_class",
            "error_message",
            "retry_attempts",
            "failure_fingerprint",
            "failed_at",
        )

        for field_name in required_fields:
            with self.subTest(field_name=field_name):
                dead_letter = self._record()
                setattr(dead_letter, field_name, None)

                with self.assertRaises(ValidationError) as exc:
                    dead_letter.full_clean()

                self.assertIn(field_name, exc.exception.message_dict)

    def test_failure_class_allows_only_declared_enum_values(self):
        dead_letter = self._record(failure_class="not-a-real-class")

        with self.assertRaises(ValidationError) as exc:
            dead_letter.full_clean()

        self.assertIn("failure_class", exc.exception.message_dict)
