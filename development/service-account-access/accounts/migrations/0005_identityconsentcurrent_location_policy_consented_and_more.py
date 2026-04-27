from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_driveraccount_identity_alter_account_route_no_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="identityconsentcurrent",
            name="location_policy_consented",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="identityconsentcurrent",
            name="privacy_policy_consented",
            field=models.BooleanField(default=True),
        ),
    ]
