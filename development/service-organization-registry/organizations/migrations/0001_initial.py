from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Company",
            fields=[
                (
                    "company_id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
            ],
            options={"ordering": ("name",)},
        ),
        migrations.CreateModel(
            name="Fleet",
            fields=[
                (
                    "fleet_id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("company_id", models.UUIDField()),
                ("name", models.CharField(max_length=255)),
            ],
            options={"ordering": ("name",)},
        ),
        migrations.CreateModel(
            name="OrgUnit",
            fields=[
                (
                    "org_unit_id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("company_id", models.UUIDField()),
                ("fleet_id", models.UUIDField(blank=True, null=True)),
                ("name", models.CharField(max_length=255)),
            ],
            options={"ordering": ("name",)},
        ),
    ]
