from datetime import timezone

from rest_framework import serializers

from telemetry.models import DiagnosticEvent, TelemetryRawIngest, VehicleLocationSnapshot


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class RawIngestSerializer(serializers.Serializer):
    source_terminal_id = serializers.UUIDField(required=False, allow_null=True)
    source_vehicle_id = serializers.UUIDField(required=False, allow_null=True)
    message_topic = serializers.CharField(max_length=255)
    message_type = serializers.CharField(max_length=100)
    payload_json = serializers.JSONField()
    received_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
    )


class TelemetryRawIngestResponseSerializer(serializers.ModelSerializer):
    received_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
        read_only=True,
    )

    class Meta:
        model = TelemetryRawIngest
        fields = (
            "telemetry_raw_ingest_id",
            "source_terminal_id",
            "source_vehicle_id",
            "message_topic",
            "message_type",
            "payload_json",
            "received_at",
        )


class VehicleLocationSnapshotSerializer(serializers.ModelSerializer):
    captured_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
        read_only=True,
    )

    class Meta:
        model = VehicleLocationSnapshot
        fields = (
            "vehicle_id",
            "terminal_id",
            "lat",
            "lng",
            "captured_at",
            "snapshot_status",
        )


class DiagnosticEventSerializer(serializers.ModelSerializer):
    captured_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
        read_only=True,
    )

    class Meta:
        model = DiagnosticEvent
        fields = (
            "diagnostic_event_id",
            "vehicle_id",
            "terminal_id",
            "event_code",
            "severity",
            "event_message",
            "captured_at",
            "event_status",
        )
