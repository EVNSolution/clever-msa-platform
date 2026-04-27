from uuid import uuid4

from django.core.exceptions import ValidationError
from django.db import models


class TelemetryDeadLetter(models.Model):
    class FailureClass(models.TextChoices):
        PARSE_ERROR = "parse_error", "Parse Error"
        HUB_4XX = "hub_4xx", "Hub 4xx"
        HUB_5XX_RETRY_EXHAUSTED = "hub_5xx_retry_exhausted", "Hub 5xx Retry Exhausted"
        CONNECTION_FAILURE_RETRY_EXHAUSTED = (
            "connection_failure_retry_exhausted",
            "Connection Failure Retry Exhausted",
        )
        TIMEOUT_RETRY_EXHAUSTED = "timeout_retry_exhausted", "Timeout Retry Exhausted"

    telemetry_dead_letter_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    source_service = models.CharField(max_length=128)
    message_topic = models.CharField(max_length=255)
    source_terminal_id = models.UUIDField(null=True, blank=True)
    source_vehicle_id = models.UUIDField(null=True, blank=True)
    message_type = models.CharField(max_length=128, null=True, blank=True)
    payload_json = models.JSONField()
    received_at = models.DateTimeField()
    failure_class = models.CharField(max_length=64, choices=FailureClass.choices)
    error_message = models.TextField()
    retry_attempts = models.PositiveIntegerField()
    failure_fingerprint = models.CharField(max_length=255)
    failed_at = models.DateTimeField()

    class Meta:
        db_table = "telemetry_dead_letter"
        ordering = ["-failed_at"]

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            raise ValidationError("Telemetry dead letters are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Telemetry dead letters are append-only.")
