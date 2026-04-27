from django.db import migrations, models


def populate_vehicle_master_route_no(apps, schema_editor):
    VehicleMaster = apps.get_model("vehicles", "VehicleMaster")
    for index, vehicle in enumerate(VehicleMaster.objects.order_by("vehicle_id"), start=1):
        vehicle.route_no = index
        vehicle.save(update_fields=["route_no"])


class Migration(migrations.Migration):
    dependencies = [
        ("vehicles", "0002_vehicle_master_and_operator_access"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehiclemaster",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, null=True, unique=True),
        ),
        migrations.RunPython(populate_vehicle_master_route_no, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="vehiclemaster",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, unique=True),
        ),
    ]
