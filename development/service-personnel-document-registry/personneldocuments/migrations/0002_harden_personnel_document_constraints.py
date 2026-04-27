from django.db import migrations, models
from django.db.models import F, Q


class Migration(migrations.Migration):
    dependencies = [
        ("personneldocuments", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="personneldocument",
            name="personnel_documents_unique_driver_type_number",
        ),
        migrations.AddConstraint(
            model_name="personneldocument",
            constraint=models.UniqueConstraint(
                fields=("driver_id", "document_type", "document_number"),
                condition=Q(document_number__isnull=False) & ~Q(document_number=""),
                name="personnel_documents_unique_driver_type_number",
            ),
        ),
        migrations.AddConstraint(
            model_name="personneldocument",
            constraint=models.CheckConstraint(
                condition=Q(issued_on__isnull=True)
                | Q(expires_on__isnull=True)
                | Q(expires_on__gte=F("issued_on")),
                name="personnel_documents_valid_date_range",
            ),
        ),
        migrations.AddConstraint(
            model_name="personneldocument",
            constraint=models.CheckConstraint(
                condition=Q(
                    document_type__in=[
                        "contract",
                        "license_or_certificate",
                        "bank_account_proof",
                        "business_registration",
                    ]
                ),
                name="personnel_documents_valid_document_type",
            ),
        ),
        migrations.AddConstraint(
            model_name="personneldocument",
            constraint=models.CheckConstraint(
                condition=Q(status__in=["draft", "active", "expired", "revoked"]),
                name="personnel_documents_valid_status",
            ),
        ),
    ]
