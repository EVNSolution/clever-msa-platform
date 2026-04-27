from datetime import datetime, timezone
from uuid import UUID

from django.core.management.base import BaseCommand

from telemetry.models import (
    DiagnosticEvent,
    TelemetryRawIngest,
    TelemetryTimeseries,
    VehicleLocationSnapshot,
)


SAMPLE_RAW_INGEST_ID = UUID("72000000-0000-0000-0000-000000000001")
SAMPLE_TIMESERIES_ID = UUID("73000000-0000-0000-0000-000000000001")
SAMPLE_DIAGNOSTIC_EVENT_ID = UUID("74000000-0000-0000-0000-000000000001")
SAMPLE_TERMINAL_ID = UUID("70000000-0000-0000-0000-000000000001")
SAMPLE_VEHICLE_ID = UUID("50000000-0000-0000-0000-000000000001")
SAMPLE_CAPTURED_AT = datetime(2026, 3, 21, 9, 0, 0, tzinfo=timezone.utc)
SAMPLE_RECEIVED_AT = datetime(2026, 3, 21, 9, 0, 5, tzinfo=timezone.utc)


class Command(BaseCommand):
    help = "Create or update seeded telemetry data."

    def handle(self, *args, **options):
        TelemetryRawIngest.objects.filter(telemetry_raw_ingest_id=SAMPLE_RAW_INGEST_ID).delete()
        TelemetryTimeseries.objects.filter(telemetry_timeseries_id=SAMPLE_TIMESERIES_ID).delete()
        DiagnosticEvent.objects.filter(diagnostic_event_id=SAMPLE_DIAGNOSTIC_EVENT_ID).delete()

        TelemetryRawIngest.objects.create(
            telemetry_raw_ingest_id=SAMPLE_RAW_INGEST_ID,
            source_terminal_id=SAMPLE_TERMINAL_ID,
            source_vehicle_id=SAMPLE_VEHICLE_ID,
            message_topic="vehicles/telemetry",
            message_type="location_update",
            payload_json={
                "captured_at": SAMPLE_CAPTURED_AT.isoformat().replace("+00:00", "Z"),
                "lat": 37.5665,
                "lng": 126.9780,
                "speed": 42.5,
                "battery_soc": 81.2,
                "key_status": "on",
                "payload_version": "v1",
                "diagnostics": [
                    {
                        "event_code": "BAT_LOW",
                        "severity": DiagnosticEvent.Severity.WARNING,
                        "event_message": "Battery is low.",
                        "event_status": DiagnosticEvent.EventStatus.OPEN,
                    }
                ],
            },
            received_at=SAMPLE_RECEIVED_AT,
        )

        TelemetryTimeseries.objects.create(
            telemetry_timeseries_id=SAMPLE_TIMESERIES_ID,
            source_terminal_id=SAMPLE_TERMINAL_ID,
            source_vehicle_id=SAMPLE_VEHICLE_ID,
            captured_at=SAMPLE_CAPTURED_AT,
            lat=37.5665,
            lng=126.9780,
            speed=42.5,
            battery_soc=81.2,
            key_status="on",
            payload_version="v1",
        )

        VehicleLocationSnapshot.objects.update_or_create(
            vehicle_id=SAMPLE_VEHICLE_ID,
            defaults={
                "terminal_id": SAMPLE_TERMINAL_ID,
                "lat": 37.5665,
                "lng": 126.9780,
                "captured_at": SAMPLE_CAPTURED_AT,
                "snapshot_status": VehicleLocationSnapshot.SnapshotStatus.FRESH,
            },
        )

        DiagnosticEvent.objects.create(
            diagnostic_event_id=SAMPLE_DIAGNOSTIC_EVENT_ID,
            vehicle_id=SAMPLE_VEHICLE_ID,
            terminal_id=SAMPLE_TERMINAL_ID,
            event_code="BAT_LOW",
            severity=DiagnosticEvent.Severity.WARNING,
            event_message="Battery is low.",
            captured_at=SAMPLE_CAPTURED_AT,
            event_status=DiagnosticEvent.EventStatus.OPEN,
        )

        self.stdout.write(self.style.SUCCESS("Seeded telemetry data."))
