from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dispatch", "0003_dispatchworkrule_driverdayexception"),
    ]

    operations = [
        migrations.AddField(
            model_name="outsourceddriver",
            name="archived_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="outsourceddriver",
            name="status",
            field=models.CharField(
                choices=[("active", "active"), ("archived", "archived")],
                default="active",
                max_length=32,
            ),
        ),
    ]
