from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Account",
            fields=[
                (
                    "account_id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("password_hash", models.CharField(max_length=128)),
                (
                    "role",
                    models.CharField(
                        max_length=16,
                        choices=[("admin", "Admin"), ("user", "User")],
                        default="user",
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ("email",)},
        )
    ]
