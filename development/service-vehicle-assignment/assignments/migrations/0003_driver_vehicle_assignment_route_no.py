from django.db import migrations, models


def allocate_route_numbers(apps, schema_editor):
    DriverVehicleAssignment = apps.get_model(
        "assignments",
        "DriverVehicleAssignment",
    )
    for index, assignment in enumerate(
        DriverVehicleAssignment.objects.order_by("driver_vehicle_assignment_id"),
        start=1,
    ):
        assignment.route_no = index
        assignment.save(update_fields=["route_no"])


class Migration(migrations.Migration):
    dependencies = [
        ("assignments", "0002_unique_assigned_vehicle"),
    ]

    operations = [
        migrations.AddField(
            model_name="drivervehicleassignment",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, null=True, unique=True),
        ),
        migrations.RunPython(allocate_route_numbers, migrations.RunPython.noop),
    ]
