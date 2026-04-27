from datetime import datetime, timezone
from unittest.mock import Mock

from django.core.management import call_command
from django.test import TestCase

from telemetry.models import (
    DiagnosticEvent,
    TelemetryRawIngest,
    TelemetryTimeseries,
    VehicleLocationSnapshot,
)


class SeedTelemetryCommandTests(TestCase):
    def test_seed_command_creates_deterministic_seed_records(self):
        call_command("seed_telemetry", stdout=Mock())

        self.assertEqual(TelemetryRawIngest.objects.count(), 1)
        self.assertEqual(TelemetryTimeseries.objects.count(), 1)
        self.assertEqual(DiagnosticEvent.objects.count(), 1)
        self.assertEqual(VehicleLocationSnapshot.objects.count(), 1)

        raw = TelemetryRawIngest.objects.get(
            telemetry_raw_ingest_id="72000000-0000-0000-0000-000000000001"
        )
        self.assertEqual(str(raw.source_terminal_id), "70000000-0000-0000-0000-000000000001")
        self.assertEqual(str(raw.source_vehicle_id), "50000000-0000-0000-0000-000000000001")
        self.assertEqual(raw.message_topic, "vehicles/telemetry")
        self.assertEqual(raw.message_type, "location_update")
        self.assertEqual(raw.received_at, datetime(2026, 3, 21, 9, 0, 5, tzinfo=timezone.utc))

        timeseries = TelemetryTimeseries.objects.get(
            telemetry_timeseries_id="73000000-0000-0000-0000-000000000001"
        )
        self.assertEqual(str(timeseries.source_terminal_id), "70000000-0000-0000-0000-000000000001")
        self.assertEqual(str(timeseries.source_vehicle_id), "50000000-0000-0000-0000-000000000001")
        self.assertEqual(timeseries.lat, 37.5665)
        self.assertEqual(timeseries.lng, 126.978)
        self.assertEqual(timeseries.speed, 42.5)
        self.assertEqual(timeseries.battery_soc, 81.2)
        self.assertEqual(timeseries.key_status, "on")
        self.assertEqual(timeseries.payload_version, "v1")

        snapshot = VehicleLocationSnapshot.objects.get(vehicle_id="50000000-0000-0000-0000-000000000001")
        self.assertEqual(str(snapshot.terminal_id), "70000000-0000-0000-0000-000000000001")
        self.assertEqual(snapshot.snapshot_status, VehicleLocationSnapshot.SnapshotStatus.FRESH)
        self.assertEqual(snapshot.captured_at, datetime(2026, 3, 21, 9, 0, 0, tzinfo=timezone.utc))

        diagnostic = DiagnosticEvent.objects.get(
            diagnostic_event_id="74000000-0000-0000-0000-000000000001"
        )
        self.assertEqual(diagnostic.event_code, "BAT_LOW")
        self.assertEqual(diagnostic.severity, DiagnosticEvent.Severity.WARNING)
        self.assertEqual(diagnostic.event_message, "Battery is low.")
        self.assertEqual(diagnostic.event_status, DiagnosticEvent.EventStatus.OPEN)

    def test_seed_command_rerun_restores_seed_state_without_duplication(self):
        call_command("seed_telemetry", stdout=Mock())

        snapshot = VehicleLocationSnapshot.objects.get(vehicle_id="50000000-0000-0000-0000-000000000001")
        snapshot.lat = 35.0
        snapshot.lng = 128.0
        snapshot.snapshot_status = VehicleLocationSnapshot.SnapshotStatus.STALE
        snapshot.save(update_fields=["lat", "lng", "snapshot_status"])

        DiagnosticEvent.objects.all().delete()

        call_command("seed_telemetry", stdout=Mock())

        self.assertEqual(TelemetryRawIngest.objects.count(), 1)
        self.assertEqual(TelemetryTimeseries.objects.count(), 1)
        self.assertEqual(DiagnosticEvent.objects.count(), 1)
        self.assertEqual(VehicleLocationSnapshot.objects.count(), 1)

        snapshot.refresh_from_db()
        self.assertEqual(snapshot.lat, 37.5665)
        self.assertEqual(snapshot.lng, 126.978)
        self.assertEqual(snapshot.snapshot_status, VehicleLocationSnapshot.SnapshotStatus.FRESH)
