from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="DriverVehicleAssignment",
            fields=[
                (
                    "driver_vehicle_assignment_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("driver_id", models.UUIDField()),
                ("vehicle_id", models.UUIDField()),
                ("operator_company_id", models.UUIDField()),
                (
                    "assignment_status",
                    models.CharField(
                        choices=[
                            ("assigned", "assigned"),
                            ("unassigned", "unassigned"),
                        ],
                        max_length=32,
                    ),
                ),
                ("assigned_at", models.DateTimeField()),
                ("unassigned_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("driver_vehicle_assignment_id",),
            },
        ),
    ]
