from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_companymanagerrole"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ManagerNavigationPolicy",
        ),
    ]
