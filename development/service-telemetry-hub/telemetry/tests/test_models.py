from pathlib import Path
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from telemetry.models import DiagnosticEvent, TelemetryTimeseries


class TelemetryModelTests(TestCase):
    def test_initial_migration_exists_for_startup_migrate(self):
        migration_file = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_file.exists())

    def test_timeseries_requires_source_identity(self):
        measurement = TelemetryTimeseries(
            source_terminal_id=None,
            source_vehicle_id=None,
            captured_at="2026-03-21T09:00:00Z",
        )

        with self.assertRaises(ValidationError):
            measurement.full_clean()

    def test_diagnostic_event_rejects_duplicate_vehicle_event_at_same_capture_time(self):
        vehicle_id = uuid4()
        terminal_id = uuid4()
        captured_at = "2026-03-21T09:00:00Z"

        DiagnosticEvent.objects.create(
            vehicle_id=vehicle_id,
            terminal_id=terminal_id,
            event_code="BAT_LOW",
            severity=DiagnosticEvent.Severity.WARNING,
            event_message="Battery is low.",
            captured_at=captured_at,
            event_status=DiagnosticEvent.EventStatus.OPEN,
        )

        with self.assertRaises(IntegrityError):
            DiagnosticEvent.objects.create(
                vehicle_id=vehicle_id,
                terminal_id=terminal_id,
                event_code="BAT_LOW",
                severity=DiagnosticEvent.Severity.WARNING,
                event_message="Battery is low.",
                captured_at=captured_at,
                event_status=DiagnosticEvent.EventStatus.OPEN,
            )
