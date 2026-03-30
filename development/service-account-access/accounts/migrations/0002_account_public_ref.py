import secrets

import accounts.models
from django.db import migrations, models


def _generate_unique_public_ref(Account):
    while True:
        candidate = f"acc_{secrets.token_hex(8)}"
        if not Account.objects.filter(public_ref=candidate).exists():
            return candidate


def populate_account_public_refs(apps, schema_editor):
    Account = apps.get_model("accounts", "Account")
    for account in Account.objects.filter(public_ref__isnull=True).iterator():
        account.public_ref = _generate_unique_public_ref(Account)
        account.save(update_fields=["public_ref"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="public_ref",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.RunPython(populate_account_public_refs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="account",
            name="public_ref",
            field=models.CharField(
                default=accounts.models.generate_account_public_ref,
                editable=False,
                max_length=20,
                unique=True,
            ),
        ),
    ]
