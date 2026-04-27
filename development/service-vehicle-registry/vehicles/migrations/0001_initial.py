import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Vehicle",
            fields=[
                (
                    "vehicle_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("company_id", models.UUIDField()),
                ("fleet_id", models.UUIDField(blank=True, null=True)),
                ("plate_number", models.CharField(max_length=64, unique=True)),
                ("vin", models.CharField(max_length=64, unique=True)),
                (
                    "vehicle_status",
                    models.CharField(
                        choices=[
                            ("active", "active"),
                            ("inactive", "inactive"),
                            ("retired", "retired"),
                        ],
                        max_length=32,
                    ),
                ),
            ],
            options={"ordering": ("vehicle_id",)},
        ),
    ]
