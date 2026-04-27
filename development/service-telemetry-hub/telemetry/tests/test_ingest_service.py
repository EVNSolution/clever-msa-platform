from datetime import datetime, timezone
from uuid import uuid4

from django.test import TestCase

from telemetry.models import (
    DiagnosticEvent,
    TelemetryRawIngest,
    TelemetryTimeseries,
    VehicleLocationSnapshot,
)
from telemetry.services.ingest_service import IngestService


class IngestServiceTests(TestCase):
    def setUp(self) -> None:
        self.service = IngestService()
        self.vehicle_id = uuid4()
        self.terminal_id = uuid4()

    def _payload(self, **overrides):
        payload = {
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
        payload.update(overrides)
        return payload

    def test_ingest_creates_raw_timeseries_snapshot_and_diagnostic(self):
        result = self.service.ingest_raw(self._payload())

        self.assertIsInstance(result.raw_ingest, TelemetryRawIngest)
        self.assertIsInstance(result.timeseries, TelemetryTimeseries)
        self.assertIsInstance(result.snapshot, VehicleLocationSnapshot)
        self.assertEqual(DiagnosticEvent.objects.count(), 1)
        self.assertEqual(result.snapshot.snapshot_status, VehicleLocationSnapshot.SnapshotStatus.FRESH)

    def test_newer_measurement_updates_snapshot_but_older_one_does_not(self):
        self.service.ingest_raw(self._payload())
        newer_payload = self._payload(
            payload_json={
                "captured_at": "2026-03-21T09:05:00Z",
                "lat": 37.5800,
                "lng": 126.9900,
                "speed": 35.0,
                "battery_soc": 79.0,
                "key_status": "on",
                "payload_version": "v1",
                "diagnostics": [],
            }
        )
        older_payload = self._payload(
            payload_json={
                "captured_at": "2026-03-21T08:55:00Z",
                "lat": 35.0000,
                "lng": 128.0000,
                "speed": 10.0,
                "battery_soc": 88.0,
                "key_status": "off",
                "payload_version": "v1",
                "diagnostics": [],
            }
        )

        newer_result = self.service.ingest_raw(newer_payload)
        older_result = self.service.ingest_raw(older_payload)

        snapshot = VehicleLocationSnapshot.objects.get(vehicle_id=self.vehicle_id)
        self.assertEqual(snapshot.lat, newer_result.snapshot.lat)
        self.assertEqual(snapshot.lng, newer_result.snapshot.lng)
        self.assertEqual(snapshot.captured_at, newer_result.snapshot.captured_at)
        self.assertLess(older_result.timeseries.captured_at, snapshot.captured_at)

    def test_ingest_skips_duplicate_diagnostic_for_same_vehicle_code_and_capture_time(self):
        payload = self._payload()
        self.service.ingest_raw(payload)

        result = self.service.ingest_raw(payload)

        self.assertIsNotNone(result.raw_ingest)
        self.assertIsNotNone(result.timeseries)
        self.assertEqual(DiagnosticEvent.objects.count(), 1)

    def test_ingest_stores_raw_and_skips_downstream_without_vehicle_and_terminal_identity(self):
        payload = self._payload(
            source_terminal_id=None,
            source_vehicle_id=None,
        )

        result = self.service.ingest_raw(payload)

        self.assertIsInstance(result.raw_ingest, TelemetryRawIngest)
        self.assertIsNone(result.timeseries)
        self.assertIsNone(result.snapshot)
        self.assertEqual(result.diagnostics, [])
        self.assertEqual(TelemetryRawIngest.objects.count(), 1)
        self.assertEqual(TelemetryTimeseries.objects.count(), 0)
        self.assertEqual(VehicleLocationSnapshot.objects.count(), 0)

    def test_ingest_stores_raw_and_skips_downstream_when_captured_at_is_missing(self):
        payload = self._payload(
            payload_json={
                "lat": 37.5665,
                "lng": 126.9780,
                "diagnostics": [],
            }
        )

        result = self.service.ingest_raw(payload)

        self.assertIsInstance(result.raw_ingest, TelemetryRawIngest)
        self.assertIsNone(result.timeseries)
        self.assertIsNone(result.snapshot)
        self.assertEqual(result.diagnostics, [])
        self.assertEqual(TelemetryRawIngest.objects.count(), 1)
        self.assertEqual(TelemetryTimeseries.objects.count(), 0)

    def test_ingest_skips_malformed_diagnostic_entries_without_rolling_back_raw(self):
        payload = self._payload(
            payload_json={
                "captured_at": "2026-03-21T09:00:00Z",
                "lat": 37.5665,
                "lng": 126.9780,
                "diagnostics": [
                    {
                        "event_code": "BAT_LOW",
                    }
                ],
            }
        )

        result = self.service.ingest_raw(payload)

        self.assertIsInstance(result.raw_ingest, TelemetryRawIngest)
        self.assertIsNotNone(result.timeseries)
        self.assertEqual(result.diagnostics, [])
        self.assertEqual(TelemetryRawIngest.objects.count(), 1)
        self.assertEqual(TelemetryTimeseries.objects.count(), 1)
        self.assertEqual(DiagnosticEvent.objects.count(), 0)

    def test_newer_measurement_reassigns_snapshot_when_terminal_moves_to_new_vehicle(self):
        original_vehicle_id = self.vehicle_id
        next_vehicle_id = uuid4()

        self.service.ingest_raw(self._payload())
        result = self.service.ingest_raw(
            self._payload(
                source_vehicle_id=str(next_vehicle_id),
                payload_json={
                    "captured_at": "2026-03-21T09:10:00Z",
                    "lat": 37.5800,
                    "lng": 126.9900,
                    "diagnostics": [],
                },
            )
        )

        self.assertEqual(VehicleLocationSnapshot.objects.count(), 1)
        self.assertFalse(
            VehicleLocationSnapshot.objects.filter(vehicle_id=original_vehicle_id).exists()
        )
        snapshot = VehicleLocationSnapshot.objects.get(vehicle_id=next_vehicle_id)
        self.assertEqual(snapshot.terminal_id, self.terminal_id)
        self.assertEqual(snapshot.captured_at, result.timeseries.captured_at)
