from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("assignments", "0001_initial"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="drivervehicleassignment",
            constraint=models.UniqueConstraint(
                condition=Q(assignment_status="assigned"),
                fields=("vehicle_id",),
                name="unique_assigned_vehicle_id",
            ),
        ),
    ]
