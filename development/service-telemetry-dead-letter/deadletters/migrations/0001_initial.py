import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="TelemetryDeadLetter",
            fields=[
                (
                    "telemetry_dead_letter_id",
                    models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
                ),
                ("source_service", models.CharField(max_length=128)),
                ("message_topic", models.CharField(max_length=255)),
                ("source_terminal_id", models.UUIDField(blank=True, null=True)),
                ("source_vehicle_id", models.UUIDField(blank=True, null=True)),
                ("message_type", models.CharField(blank=True, max_length=128, null=True)),
                ("payload_json", models.JSONField()),
                ("received_at", models.DateTimeField()),
                (
                    "failure_class",
                    models.CharField(
                        choices=[
                            ("parse_error", "Parse Error"),
                            ("hub_4xx", "Hub 4xx"),
                            ("hub_5xx_retry_exhausted", "Hub 5xx Retry Exhausted"),
                            (
                                "connection_failure_retry_exhausted",
                                "Connection Failure Retry Exhausted",
                            ),
                            ("timeout_retry_exhausted", "Timeout Retry Exhausted"),
                        ],
                        max_length=64,
                    ),
                ),
                ("error_message", models.TextField()),
                ("retry_attempts", models.PositiveIntegerField()),
                ("failure_fingerprint", models.CharField(max_length=255)),
                ("failed_at", models.DateTimeField()),
            ],
            options={
                "db_table": "telemetry_dead_letter",
                "ordering": ["-failed_at"],
            },
        ),
    ]
