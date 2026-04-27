import django.db.models.deletion
import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="TerminalRegistry",
            fields=[
                (
                    "terminal_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("manufacturer_company_id", models.UUIDField()),
                ("imei", models.CharField(max_length=64, unique=True)),
                ("iccid", models.CharField(max_length=64, unique=True)),
                ("firmware_version", models.CharField(max_length=64)),
                ("protocol_version", models.CharField(max_length=64)),
                ("app_version", models.CharField(max_length=64)),
                (
                    "terminal_status",
                    models.CharField(
                        choices=[
                            ("active", "active"),
                            ("inactive", "inactive"),
                            ("retired", "retired"),
                        ],
                        max_length=32,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("terminal_id",)},
        ),
        migrations.CreateModel(
            name="TerminalInstallation",
            fields=[
                (
                    "terminal_installation_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("vehicle_id", models.UUIDField()),
                (
                    "installation_status",
                    models.CharField(
                        choices=[("installed", "installed"), ("removed", "removed")],
                        max_length=32,
                    ),
                ),
                ("installed_at", models.DateTimeField()),
                ("removed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "terminal",
                    models.ForeignKey(
                        db_column="terminal_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="installations",
                        to="terminals.terminalregistry",
                    ),
                ),
            ],
            options={"ordering": ("terminal_installation_id",)},
        ),
        migrations.AddConstraint(
            model_name="terminalinstallation",
            constraint=models.UniqueConstraint(
                condition=models.Q(("installation_status", "installed")),
                fields=("terminal",),
                name="terminals_one_active_installation_per_terminal",
            ),
        ),
        migrations.AddConstraint(
            model_name="terminalinstallation",
            constraint=models.UniqueConstraint(
                condition=models.Q(("installation_status", "installed")),
                fields=("vehicle_id",),
                name="terminals_one_active_installation_per_vehicle",
            ),
        ),
    ]
