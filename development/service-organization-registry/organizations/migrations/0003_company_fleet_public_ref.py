import secrets

import organizations.models
from django.db import migrations, models


def _generate_unique_public_ref(model, prefix):
    while True:
        candidate = f"{prefix}{secrets.token_hex(8)}"
        if not model.objects.filter(public_ref=candidate).exists():
            return candidate


def populate_company_and_fleet_public_refs(apps, schema_editor):
    Company = apps.get_model("organizations", "Company")
    Fleet = apps.get_model("organizations", "Fleet")

    for company in Company.objects.filter(public_ref__isnull=True).iterator():
        company.public_ref = _generate_unique_public_ref(Company, "cmp_")
        company.save(update_fields=["public_ref"])

    for fleet in Fleet.objects.filter(public_ref__isnull=True).iterator():
        fleet.public_ref = _generate_unique_public_ref(Fleet, "flt_")
        fleet.save(update_fields=["public_ref"])


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0002_remove_orgunit"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="public_ref",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="fleet",
            name="public_ref",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.RunPython(
            populate_company_and_fleet_public_refs,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="company",
            name="public_ref",
            field=models.CharField(
                default=organizations.models.generate_company_public_ref,
                editable=False,
                max_length=20,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name="fleet",
            name="public_ref",
            field=models.CharField(
                default=organizations.models.generate_fleet_public_ref,
                editable=False,
                max_length=20,
                unique=True,
            ),
        ),
    ]
