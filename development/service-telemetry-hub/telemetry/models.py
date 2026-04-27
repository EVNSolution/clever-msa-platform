from uuid import uuid4

from django.core.exceptions import ValidationError
from django.db import models


class AppendOnlyModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Append-only telemetry records cannot be updated.")
        self.full_clean()
        return super().save(*args, **kwargs)


class TelemetryRawIngest(AppendOnlyModel):
    telemetry_raw_ingest_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    source_terminal_id = models.UUIDField(null=True, blank=True)
    source_vehicle_id = models.UUIDField(null=True, blank=True)
    message_topic = models.CharField(max_length=255)
    message_type = models.CharField(max_length=100)
    payload_json = models.JSONField()
    received_at = models.DateTimeField()


class TelemetryTimeseries(AppendOnlyModel):
    telemetry_timeseries_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    source_terminal_id = models.UUIDField(null=True, blank=True)
    source_vehicle_id = models.UUIDField(null=True, blank=True)
    captured_at = models.DateTimeField()
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    speed = models.FloatField(null=True, blank=True)
    battery_soc = models.FloatField(null=True, blank=True)
    key_status = models.CharField(max_length=50, null=True, blank=True)
    payload_version = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        ordering = ["-captured_at"]

    def clean(self):
        super().clean()
        if self.source_terminal_id is None and self.source_vehicle_id is None:
            raise ValidationError("At least one source identity is required.")


class VehicleLocationSnapshot(models.Model):
    class SnapshotStatus(models.TextChoices):
        FRESH = "fresh", "fresh"
        STALE = "stale", "stale"
        UNAVAILABLE = "unavailable", "unavailable"

    vehicle_id = models.UUIDField(unique=True)
    terminal_id = models.UUIDField(unique=True)
    lat = models.FloatField()
    lng = models.FloatField()
    captured_at = models.DateTimeField()
    snapshot_status = models.CharField(
        max_length=20,
        choices=SnapshotStatus.choices,
        default=SnapshotStatus.FRESH,
    )


class DiagnosticEvent(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "info"
        WARNING = "warning", "warning"
        CRITICAL = "critical", "critical"

    class EventStatus(models.TextChoices):
        OPEN = "open", "open"
        CLEARED = "cleared", "cleared"

    diagnostic_event_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    vehicle_id = models.UUIDField()
    terminal_id = models.UUIDField()
    event_code = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    event_message = models.TextField()
    captured_at = models.DateTimeField()
    event_status = models.CharField(max_length=20, choices=EventStatus.choices)

    class Meta:
        ordering = ["-captured_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["vehicle_id", "event_code", "captured_at"],
                name="unique_vehicle_event_code_captured_at",
            )
        ]
