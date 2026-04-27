from django.db import migrations, models


def populate_account_route_no(apps, schema_editor):
    Account = apps.get_model("accounts", "Account")
    for index, account in enumerate(Account.objects.order_by("email", "account_id"), start=1):
        account.route_no = index
        account.save(update_fields=["route_no"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_account_public_ref"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, null=True, unique=True),
        ),
        migrations.RunPython(populate_account_route_no, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="account",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, unique=True),
        ),
    ]
