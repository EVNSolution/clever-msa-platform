from importlib import import_module
from io import StringIO
from uuid import uuid4

from django.core.management import call_command
from django.test import TestCase

from personneldocuments.models import PersonnelDocument


def _load_seed_module(test_case: TestCase):
    try:
        return import_module("personneldocuments.management.commands.seed_personnel_documents")
    except ModuleNotFoundError as exc:
        test_case.fail(f"seed_personnel_documents command module missing: {exc}")


class SeedPersonnelDocumentsCommandTests(TestCase):
    def test_seed_command_creates_two_personnel_documents_for_seeded_driver(self):
        seed_module = _load_seed_module(self)
        stdout = StringIO()

        call_command("seed_personnel_documents", stdout=stdout)

        documents = list(
            PersonnelDocument.objects.filter(driver_id=seed_module.SAMPLE_DRIVER_ID).order_by("document_type")
        )

        self.assertEqual(PersonnelDocument.objects.count(), 2)
        self.assertEqual(
            [document.document_type for document in documents],
            [
                PersonnelDocument.DocumentType.BUSINESS_REGISTRATION,
                PersonnelDocument.DocumentType.CONTRACT,
            ],
        )
        self.assertIn("Seeded personnel document bootstrap data.", stdout.getvalue())

    def test_seed_command_is_idempotent(self):
        seed_module = _load_seed_module(self)

        call_command("seed_personnel_documents", stdout=StringIO())
        first_contract = PersonnelDocument.objects.get(
            personnel_document_id=seed_module.SAMPLE_CONTRACT_DOCUMENT_ID
        )
        first_registration = PersonnelDocument.objects.get(
            personnel_document_id=seed_module.SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_ID
        )

        call_command("seed_personnel_documents", stdout=StringIO())

        self.assertEqual(PersonnelDocument.objects.count(), 2)
        self.assertEqual(
            PersonnelDocument.objects.get(
                personnel_document_id=seed_module.SAMPLE_CONTRACT_DOCUMENT_ID
            ).pk,
            first_contract.pk,
        )
        self.assertEqual(
            PersonnelDocument.objects.get(
                personnel_document_id=seed_module.SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_ID
            ).pk,
            first_registration.pk,
        )

    def test_seed_command_reconciles_dirty_rows_by_business_identity(self):
        seed_module = _load_seed_module(self)
        existing_contract = PersonnelDocument.objects.create(
            personnel_document_id=uuid4(),
            driver_id=seed_module.SAMPLE_DRIVER_ID,
            document_type=PersonnelDocument.DocumentType.CONTRACT,
            status=PersonnelDocument.DocumentStatus.DRAFT,
            title="Dirty Contract",
            document_number=seed_module.SAMPLE_CONTRACT_DOCUMENT_NUMBER,
            payload={"source": "dirty"},
        )
        existing_registration = PersonnelDocument.objects.create(
            personnel_document_id=uuid4(),
            driver_id=seed_module.SAMPLE_DRIVER_ID,
            document_type=PersonnelDocument.DocumentType.BUSINESS_REGISTRATION,
            status=PersonnelDocument.DocumentStatus.DRAFT,
            title="Dirty Registration",
            document_number=seed_module.SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_NUMBER,
            payload={"source": "dirty"},
        )

        call_command("seed_personnel_documents", stdout=StringIO())

        self.assertEqual(PersonnelDocument.objects.count(), 2)
        contract = PersonnelDocument.objects.get(
            driver_id=seed_module.SAMPLE_DRIVER_ID,
            document_type=PersonnelDocument.DocumentType.CONTRACT,
            document_number=seed_module.SAMPLE_CONTRACT_DOCUMENT_NUMBER,
        )
        registration = PersonnelDocument.objects.get(
            driver_id=seed_module.SAMPLE_DRIVER_ID,
            document_type=PersonnelDocument.DocumentType.BUSINESS_REGISTRATION,
            document_number=seed_module.SAMPLE_BUSINESS_REGISTRATION_DOCUMENT_NUMBER,
        )

        self.assertEqual(contract.pk, existing_contract.pk)
        self.assertEqual(registration.pk, existing_registration.pk)
        self.assertEqual(contract.status, PersonnelDocument.DocumentStatus.ACTIVE)
        self.assertEqual(registration.status, PersonnelDocument.DocumentStatus.ACTIVE)
