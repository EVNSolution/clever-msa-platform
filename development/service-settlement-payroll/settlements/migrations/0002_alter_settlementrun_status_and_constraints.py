from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("settlements", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="settlementrun",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("calculated", "Calculated"),
                    ("reviewed", "Reviewed"),
                    ("approved", "Approved"),
                    ("paid", "Paid"),
                    ("closed", "Closed"),
                ],
                max_length=32,
            ),
        ),
        migrations.AddConstraint(
            model_name="settlementrun",
            constraint=models.CheckConstraint(
                check=models.Q(
                    status__in=["draft", "calculated", "reviewed", "approved", "paid", "closed"]
                ),
                name="settlementrun_status_valid",
            ),
        ),
    ]
