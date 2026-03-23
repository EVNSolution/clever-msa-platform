import uuid

from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("vehicles", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Vehicle",
        ),
        migrations.CreateModel(
            name="VehicleMaster",
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
                ("manufacturer_company_id", models.UUIDField()),
                ("plate_number", models.CharField(max_length=64, unique=True)),
                ("vin", models.CharField(max_length=64, unique=True)),
                (
                    "manufacturer_vehicle_code",
                    models.CharField(blank=True, max_length=64, null=True),
                ),
                ("model_name", models.CharField(max_length=128)),
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("vehicle_id",)},
        ),
        migrations.CreateModel(
            name="VehicleOperatorAccess",
            fields=[
                (
                    "vehicle_operator_access_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("operator_company_id", models.UUIDField()),
                (
                    "access_status",
                    models.CharField(
                        choices=[
                            ("active", "active"),
                            ("suspended", "suspended"),
                            ("ended", "ended"),
                        ],
                        max_length=32,
                    ),
                ),
                ("started_at", models.DateTimeField()),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "vehicle",
                    models.ForeignKey(
                        db_column="vehicle_id",
                        on_delete=models.deletion.CASCADE,
                        related_name="operator_accesses",
                        to="vehicles.vehiclemaster",
                    ),
                ),
            ],
            options={"ordering": ("vehicle_operator_access_id",)},
        ),
        migrations.AddConstraint(
            model_name="vehicleoperatoraccess",
            constraint=models.UniqueConstraint(
                condition=Q(("access_status", "active")),
                fields=("vehicle",),
                name="vehicles_one_active_operator_access_per_vehicle",
            ),
        ),
    ]
