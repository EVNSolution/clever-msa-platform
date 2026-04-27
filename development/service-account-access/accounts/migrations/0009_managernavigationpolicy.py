from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_alter_manageraccount_role_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="ManagerNavigationPolicy",
            fields=[
                ("manager_navigation_policy_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("manager_role", models.CharField(choices=[("company_super_admin", "Company Super Admin"), ("vehicle_manager", "Vehicle Manager"), ("settlement_manager", "Settlement Manager"), ("fleet_manager", "Fleet Manager")], max_length=32)),
                ("nav_item_key", models.CharField(max_length=64)),
                ("action", models.CharField(choices=[("view", "View")], default="view", max_length=32)),
                ("effect", models.CharField(choices=[("allow", "Allow"), ("deny", "Deny")], default="allow", max_length=16)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("manager_role", "nav_item_key", "action"),
            },
        ),
        migrations.AddConstraint(
            model_name="managernavigationpolicy",
            constraint=models.UniqueConstraint(fields=("manager_role", "nav_item_key", "action"), name="uniq_manager_navigation_policy_role_key_action"),
        ),
    ]
