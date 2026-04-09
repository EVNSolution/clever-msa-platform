from django.db import migrations, models
import django.db.models.expressions
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_manager_navigation_policy_company_override"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyManagerRole",
            fields=[
                ("company_manager_role_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("company_id", models.UUIDField()),
                ("code", models.CharField(max_length=64)),
                ("display_name", models.CharField(max_length=120)),
                ("is_system_required", models.BooleanField(default=False)),
                ("is_default", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("allowed_nav_keys", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("company_id", "-is_system_required", "-is_default", "created_at"),
            },
        ),
        migrations.AddConstraint(
            model_name="companymanagerrole",
            constraint=models.UniqueConstraint(
                condition=models.Q(("is_active", True)),
                fields=("company_id", "code"),
                name="uniq_active_company_manager_role_code",
            ),
        ),
    ]
