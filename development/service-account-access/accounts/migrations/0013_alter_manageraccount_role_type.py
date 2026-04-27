from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0012_delete_managernavigationpolicy"),
    ]

    operations = [
        migrations.AlterField(
            model_name="manageraccount",
            name="role_type",
            field=models.CharField(max_length=32),
        ),
    ]
