from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("dispatch", "0002_alter_dispatchassignment_driver_id_outsourceddriver_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="DispatchWorkRule",
            fields=[
                ("work_rule_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("company_id", models.UUIDField()),
                ("name", models.CharField(max_length=120)),
                ("system_kind", models.CharField(choices=[("working", "working"), ("day_off", "day_off"), ("overtime", "overtime")], max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("work_rule_id",),
                "constraints": [
                    models.UniqueConstraint(fields=("company_id", "name"), name="unique_dispatch_work_rule_name_per_company"),
                ],
            },
        ),
        migrations.CreateModel(
            name="DriverDayException",
            fields=[
                ("driver_day_exception_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("company_id", models.UUIDField()),
                ("fleet_id", models.UUIDField()),
                ("dispatch_date", models.DateField()),
                ("driver_id", models.UUIDField()),
                ("memo", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "work_rule",
                    models.ForeignKey(
                        db_column="work_rule_id",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="driver_day_exceptions",
                        to="dispatch.dispatchworkrule",
                    ),
                ),
            ],
            options={
                "ordering": ("driver_day_exception_id",),
                "constraints": [
                    models.UniqueConstraint(fields=("driver_id", "dispatch_date"), name="unique_driver_day_exception_per_driver_date"),
                ],
            },
        ),
    ]
