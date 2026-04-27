from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SettlementRun",
            fields=[
                (
                    "settlement_run_id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("company_id", models.UUIDField()),
                ("fleet_id", models.UUIDField()),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                ("status", models.CharField(max_length=32)),
            ],
            options={"ordering": ("period_start", "settlement_run_id")},
        ),
        migrations.CreateModel(
            name="SettlementItem",
            fields=[
                (
                    "settlement_item_id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                (
                    "settlement_run",
                    models.ForeignKey(
                        db_column="settlement_run_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="settlements.settlementrun",
                        to_field="settlement_run_id",
                    ),
                ),
                ("driver_id", models.UUIDField()),
                ("amount", models.DecimalField(max_digits=12, decimal_places=2)),
                ("payout_status", models.CharField(max_length=32)),
            ],
            options={"ordering": ("settlement_item_id",)},
        ),
    ]
