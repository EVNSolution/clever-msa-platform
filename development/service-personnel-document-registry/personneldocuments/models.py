import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class PersonnelDocument(models.Model):
    class DocumentType(models.TextChoices):
        CONTRACT = "contract", "contract"
        LICENSE_OR_CERTIFICATE = "license_or_certificate", "license_or_certificate"
        BANK_ACCOUNT_PROOF = "bank_account_proof", "bank_account_proof"
        BUSINESS_REGISTRATION = "business_registration", "business_registration"

    class DocumentStatus(models.TextChoices):
        DRAFT = "draft", "draft"
        ACTIVE = "active", "active"
        EXPIRED = "expired", "expired"
        REVOKED = "revoked", "revoked"

    personnel_document_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver_id = models.UUIDField()
    document_type = models.CharField(max_length=64, choices=DocumentType.choices)
    status = models.CharField(max_length=32, choices=DocumentStatus.choices)
    title = models.CharField(max_length=255)
    document_number = models.CharField(max_length=128, null=True, blank=True)
    issuer_name = models.CharField(max_length=255, null=True, blank=True)
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    external_reference = models.CharField(max_length=255, null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("personnel_document_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("driver_id", "document_type", "document_number"),
                condition=Q(document_number__isnull=False) & ~Q(document_number=""),
                name="personnel_documents_unique_driver_type_number",
            ),
        ]

    def clean(self):
        super().clean()
        if self.issued_on and self.expires_on and self.expires_on < self.issued_on:
            raise ValidationError({"expires_on": "expires_on cannot be earlier than issued_on."})
