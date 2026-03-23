import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("settlements", "0002_alter_settlementrun_status_and_constraints"),
    ]

    operations = [
        migrations.AlterField(
            model_name="settlementitem",
            name="settlement_run",
            field=models.ForeignKey(
                db_column="settlement_run_id",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="items",
                to="settlements.settlementrun",
            ),
        ),
    ]
