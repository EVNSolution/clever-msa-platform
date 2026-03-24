from django.db import migrations, models
from django.db.models import Q
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PersonnelDocument",
            fields=[
                (
                    "personnel_document_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("driver_id", models.UUIDField()),
                (
                    "document_type",
                    models.CharField(
                        choices=[
                            ("contract", "contract"),
                            ("license_or_certificate", "license_or_certificate"),
                            ("bank_account_proof", "bank_account_proof"),
                            ("business_registration", "business_registration"),
                        ],
                        max_length=64,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "draft"),
                            ("active", "active"),
                            ("expired", "expired"),
                            ("revoked", "revoked"),
                        ],
                        max_length=32,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                (
                    "document_number",
                    models.CharField(blank=True, max_length=128, null=True),
                ),
                (
                    "issuer_name",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("issued_on", models.DateField(blank=True, null=True)),
                ("expires_on", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, null=True)),
                (
                    "external_reference",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("payload", models.JSONField(blank=True, default=dict)),
            ],
            options={
                "ordering": ("personnel_document_id",),
            },
        ),
        migrations.AddConstraint(
            model_name="personneldocument",
            constraint=models.CheckConstraint(
                condition=Q(issued_on__isnull=True)
                | Q(expires_on__isnull=True)
                | Q(expires_on__gte=models.F("issued_on")),
                name="personnel_documents_valid_date_range",
            ),
        ),
        migrations.AddConstraint(
            model_name="personneldocument",
            constraint=models.UniqueConstraint(
                condition=Q(document_number__isnull=False) & ~Q(document_number=""),
                fields=("driver_id", "document_type", "document_number"),
                name="personnel_documents_unique_driver_type_number",
            ),
        ),
    ]
