from dataclasses import dataclass

from django.db import transaction
from django.db.models import Q

from telemetry.models import (
    DiagnosticEvent,
    TelemetryRawIngest,
    TelemetryTimeseries,
    VehicleLocationSnapshot,
)


@dataclass
class IngestResult:
    raw_ingest: TelemetryRawIngest
    timeseries: TelemetryTimeseries | None
    snapshot: VehicleLocationSnapshot | None
    diagnostics: list[DiagnosticEvent]


class IngestService:
    def ingest_raw(self, payload: dict) -> IngestResult:
        raw_ingest = TelemetryRawIngest.objects.create(
            source_terminal_id=payload.get("source_terminal_id"),
            source_vehicle_id=payload.get("source_vehicle_id"),
            message_topic=payload["message_topic"],
            message_type=payload["message_type"],
            payload_json=payload["payload_json"],
            received_at=payload["received_at"],
        )

        payload_json = payload["payload_json"]
        timeseries = self._create_timeseries(payload=payload, payload_json=payload_json)
        if timeseries is None:
            return IngestResult(
                raw_ingest=raw_ingest,
                timeseries=None,
                snapshot=None,
                diagnostics=[],
            )

        diagnostics = self._create_diagnostics(timeseries=timeseries, payload_json=payload_json)
        snapshot = self._upsert_snapshot(timeseries=timeseries)

        return IngestResult(
            raw_ingest=raw_ingest,
            timeseries=timeseries,
            snapshot=snapshot,
            diagnostics=diagnostics,
        )

    @transaction.atomic
    def _create_timeseries(self, *, payload: dict, payload_json):
        if not isinstance(payload_json, dict):
            return None

        captured_at = payload_json.get("captured_at")
        if captured_at is None:
            return None

        source_terminal_id = payload.get("source_terminal_id")
        source_vehicle_id = payload.get("source_vehicle_id")
        if source_terminal_id is None and source_vehicle_id is None:
            return None

        timeseries = TelemetryTimeseries(
            source_terminal_id=source_terminal_id,
            source_vehicle_id=source_vehicle_id,
            captured_at=captured_at,
            lat=payload_json.get("lat"),
            lng=payload_json.get("lng"),
            speed=payload_json.get("speed"),
            battery_soc=payload_json.get("battery_soc"),
            key_status=payload_json.get("key_status"),
            payload_version=payload_json.get("payload_version"),
        )
        timeseries.save()
        return timeseries

    @transaction.atomic
    def _upsert_snapshot(self, *, timeseries: TelemetryTimeseries):
        if (
            timeseries.source_vehicle_id is None
            or timeseries.source_terminal_id is None
            or timeseries.lat is None
            or timeseries.lng is None
        ):
            return None

        snapshots = list(
            VehicleLocationSnapshot.objects.select_for_update()
            .filter(
                Q(vehicle_id=timeseries.source_vehicle_id) | Q(terminal_id=timeseries.source_terminal_id)
            )
            .order_by("-captured_at")
        )
        if not snapshots:
            return VehicleLocationSnapshot.objects.create(
                vehicle_id=timeseries.source_vehicle_id,
                terminal_id=timeseries.source_terminal_id,
                lat=timeseries.lat,
                lng=timeseries.lng,
                captured_at=timeseries.captured_at,
                snapshot_status=VehicleLocationSnapshot.SnapshotStatus.FRESH,
            )

        newest_snapshot = snapshots[0]
        if timeseries.captured_at <= newest_snapshot.captured_at:
            return newest_snapshot

        primary_snapshot = next(
            (
                snapshot
                for snapshot in snapshots
                if snapshot.vehicle_id == timeseries.source_vehicle_id
                or snapshot.terminal_id == timeseries.source_terminal_id
            ),
            newest_snapshot,
        )
        for snapshot in snapshots:
            if snapshot.pk != primary_snapshot.pk:
                snapshot.delete()

        primary_snapshot.vehicle_id = timeseries.source_vehicle_id
        primary_snapshot.terminal_id = timeseries.source_terminal_id
        primary_snapshot.lat = timeseries.lat
        primary_snapshot.lng = timeseries.lng
        primary_snapshot.captured_at = timeseries.captured_at
        primary_snapshot.snapshot_status = VehicleLocationSnapshot.SnapshotStatus.FRESH
        primary_snapshot.save(
            update_fields=["vehicle_id", "terminal_id", "lat", "lng", "captured_at", "snapshot_status"]
        )
        return primary_snapshot

    def _create_diagnostics(self, *, timeseries: TelemetryTimeseries, payload_json: dict):
        diagnostics = []
        if timeseries.source_vehicle_id is None or timeseries.source_terminal_id is None:
            return diagnostics

        diagnostics_payload = payload_json.get("diagnostics", [])
        if not isinstance(diagnostics_payload, list):
            return diagnostics

        for diagnostic in diagnostics_payload:
            if not isinstance(diagnostic, dict):
                continue

            event_code = diagnostic.get("event_code")
            severity = diagnostic.get("severity")
            event_message = diagnostic.get("event_message")
            event_status = diagnostic.get("event_status")
            if not all([event_code, severity, event_message, event_status]):
                continue

            duplicate = DiagnosticEvent.objects.filter(
                vehicle_id=timeseries.source_vehicle_id,
                event_code=event_code,
                captured_at=timeseries.captured_at,
            ).exists()
            if duplicate:
                continue

            diagnostics.append(
                DiagnosticEvent.objects.create(
                    vehicle_id=timeseries.source_vehicle_id,
                    terminal_id=timeseries.source_terminal_id,
                    event_code=event_code,
                    severity=severity,
                    event_message=event_message,
                    captured_at=timeseries.captured_at,
                    event_status=event_status,
                )
            )
        return diagnostics
