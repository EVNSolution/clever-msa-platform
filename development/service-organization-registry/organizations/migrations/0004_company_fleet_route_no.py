from django.db import migrations, models


def populate_company_and_fleet_route_no(apps, schema_editor):
    Company = apps.get_model("organizations", "Company")
    Fleet = apps.get_model("organizations", "Fleet")

    for index, company in enumerate(Company.objects.order_by("name", "company_id"), start=1):
        company.route_no = index
        company.save(update_fields=["route_no"])

    for index, fleet in enumerate(Fleet.objects.order_by("name", "fleet_id"), start=1):
        fleet.route_no = index
        fleet.save(update_fields=["route_no"])


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_company_fleet_public_ref"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="fleet",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, null=True, unique=True),
        ),
        migrations.RunPython(
            populate_company_and_fleet_route_no,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="company",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name="fleet",
            name="route_no",
            field=models.PositiveIntegerField(editable=False, unique=True),
        ),
    ]
