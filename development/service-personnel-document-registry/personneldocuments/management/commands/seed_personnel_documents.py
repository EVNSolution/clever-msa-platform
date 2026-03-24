from datetime import date
from uuid import UUID

from django.core.management.base import BaseCommand
from django.db import transaction

from personneldocuments.models import PersonnelDocument

SAMPLE_DRIVER_ID = UUID("10000000-0000-0000-0000-000000000001")

SAMPLE_CONTRACT_DOCUMENT_ID = UUID("97000000-0000-0000-0000-000000000001")
SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_ID = UUID("97000000-0000-0000-0000-000000000002")

SAMPLE_CONTRACT_DOCUMENT_NUMBER = "CONTRACT-2026-001"
SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_NUMBER = "BR-2026-001"


class Command(BaseCommand):
    help = "Seed deterministic personnel document bootstrap data."

    def handle(self, *args, **options):
        with transaction.atomic():
            self._seed_contract_document()
            self._seed_business_registration_document()
        self.stdout.write(self.style.SUCCESS("Seeded personnel document bootstrap data."))

    def _seed_contract_document(self):
        return self._upsert_document(
            personnel_document_id=SAMPLE_CONTRACT_DOCUMENT_ID,
            driver_id=SAMPLE_DRIVER_ID,
            document_type=PersonnelDocument.DocumentType.CONTRACT,
            status=PersonnelDocument.DocumentStatus.ACTIVE,
            title="2026 운송 계약서",
            document_number=SAMPLE_CONTRACT_DOCUMENT_NUMBER,
            issuer_name="CLEVER",
            issued_on=date(2026, 3, 24),
            expires_on=date(2027, 3, 23),
            notes="Seeded contract document for local stack.",
            external_reference="seed://personnel-documents/contract-2026-001",
            payload={"source": "bootstrap", "signed": True},
        )

    def _seed_business_registration_document(self):
        return self._upsert_document(
            personnel_document_id=SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_ID,
            driver_id=SAMPLE_DRIVER_ID,
            document_type=PersonnelDocument.DocumentType.BUSINESS_REGISTRATION,
            status=PersonnelDocument.DocumentStatus.ACTIVE,
            title="사업자등록증",
            document_number=SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_NUMBER,
            issuer_name="국세청",
            issued_on=date(2026, 3, 24),
            expires_on=None,
            notes="Seeded business registration proof for local stack.",
            external_reference="seed://personnel-documents/business-registration-2026-001",
            payload={"source": "bootstrap", "verified": True},
        )

    def _upsert_document(
        self,
        *,
        personnel_document_id,
        driver_id,
        document_type,
        status,
        title,
        document_number,
        issuer_name,
        issued_on,
        expires_on,
        notes,
        external_reference,
        payload,
    ):
        document = PersonnelDocument.objects.filter(
            driver_id=driver_id,
            document_type=document_type,
            document_number=document_number,
        ).first()
        if document is None:
            document = PersonnelDocument.objects.filter(
                personnel_document_id=personnel_document_id
            ).first()
        if document is None:
            return PersonnelDocument.objects.create(
                personnel_document_id=personnel_document_id,
                driver_id=driver_id,
                document_type=document_type,
                status=status,
                title=title,
                document_number=document_number,
                issuer_name=issuer_name,
                issued_on=issued_on,
                expires_on=expires_on,
                notes=notes,
                external_reference=external_reference,
                payload=payload,
            )

        document.driver_id = driver_id
        document.document_type = document_type
        document.status = status
        document.title = title
        document.document_number = document_number
        document.issuer_name = issuer_name
        document.issued_on = issued_on
        document.expires_on = expires_on
        document.notes = notes
        document.external_reference = external_reference
        document.payload = payload
        document.save(
            update_fields=[
                "driver_id",
                "document_type",
                "status",
                "title",
                "document_number",
                "issuer_name",
                "issued_on",
                "expires_on",
                "notes",
                "external_reference",
                "payload",
            ]
        )
        return document
