from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0009_managernavigationpolicy"),
    ]

    operations = [
        migrations.AddField(
            model_name="managernavigationpolicy",
            name="company_id",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="managernavigationpolicy",
            name="updated_by_identity_id",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name="managernavigationpolicy",
            options={"ordering": ("company_id", "manager_role", "nav_item_key", "action")},
        ),
        migrations.RemoveConstraint(
            model_name="managernavigationpolicy",
            name="uniq_manager_navigation_policy_role_key_action",
        ),
        migrations.AddConstraint(
            model_name="managernavigationpolicy",
            constraint=models.UniqueConstraint(
                condition=Q(company_id__isnull=True),
                fields=("manager_role", "nav_item_key", "action"),
                name="uniq_global_manager_navigation_policy_role_key_action",
            ),
        ),
        migrations.AddConstraint(
            model_name="managernavigationpolicy",
            constraint=models.UniqueConstraint(
                condition=Q(company_id__isnull=False),
                fields=("company_id", "manager_role", "nav_item_key", "action"),
                name="uniq_company_manager_navigation_policy_role_key_action",
            ),
        ),
    ]
