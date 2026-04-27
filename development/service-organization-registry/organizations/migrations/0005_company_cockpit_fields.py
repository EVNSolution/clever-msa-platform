from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_company_fleet_route_no"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="enabled_features",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="company",
            name="home_dashboard_preset",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="company",
            name="tenant_code",
            field=models.SlugField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="company",
            name="workflow_profile",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="company",
            name="workspace_presets",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
