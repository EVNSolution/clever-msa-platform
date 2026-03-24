from datetime import date
from importlib import import_module
from pathlib import Path
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase


def _load_models_module(test_case: TestCase):
    try:
        return import_module("personneldocuments.models")
    except ModuleNotFoundError as exc:
        test_case.fail(f"personneldocuments.models module missing: {exc}")


class PersonnelDocumentModelTests(TestCase):
    def test_initial_migration_file_exists(self):
        migration_path = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_path.exists())

    def test_personnel_document_can_be_created_and_loaded(self):
        models_module = _load_models_module(self)
        document = models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000001"),
            document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Driver Contract",
            document_number="CTR-2026-001",
            issuer_name="Clever Logistics",
            issued_on=date(2026, 3, 24),
            expires_on=date(2027, 3, 24),
            notes="Initial employment contract.",
            external_reference="hr://contracts/CTR-2026-001",
            payload={"signed": True},
        )

        loaded = models_module.PersonnelDocument.objects.get(personnel_document_id=document.personnel_document_id)

        self.assertEqual(loaded.driver_id, UUID("10000000-0000-0000-0000-000000000001"))
        self.assertEqual(loaded.document_type, models_module.PersonnelDocument.DocumentType.CONTRACT)
        self.assertEqual(loaded.status, models_module.PersonnelDocument.DocumentStatus.ACTIVE)
        self.assertEqual(loaded.document_number, "CTR-2026-001")
        self.assertEqual(loaded.payload, {"signed": True})

    def test_document_type_choices_are_limited(self):
        models_module = _load_models_module(self)
        document = models_module.PersonnelDocument(
            driver_id=UUID("10000000-0000-0000-0000-000000000002"),
            document_type="passport",
            status=models_module.PersonnelDocument.DocumentStatus.DRAFT,
            title="Passport",
        )

        with self.assertRaises(ValidationError) as context:
            document.full_clean()

        self.assertIn("document_type", context.exception.message_dict)

    def test_status_choices_are_limited(self):
        models_module = _load_models_module(self)
        document = models_module.PersonnelDocument(
            driver_id=UUID("10000000-0000-0000-0000-000000000003"),
            document_type=models_module.PersonnelDocument.DocumentType.LICENSE_OR_CERTIFICATE,
            status="pending",
            title="Safety Certificate",
        )

        with self.assertRaises(ValidationError) as context:
            document.full_clean()

        self.assertIn("status", context.exception.message_dict)

    def test_expires_on_cannot_precede_issued_on(self):
        models_module = _load_models_module(self)
        document = models_module.PersonnelDocument(
            driver_id=UUID("10000000-0000-0000-0000-000000000004"),
            document_type=models_module.PersonnelDocument.DocumentType.BANK_ACCOUNT_PROOF,
            status=models_module.PersonnelDocument.DocumentStatus.DRAFT,
            title="Bank Proof",
            issued_on=date(2026, 3, 24),
            expires_on=date(2026, 3, 23),
        )

        with self.assertRaises(ValidationError) as context:
            document.full_clean()

        self.assertIn("expires_on", context.exception.message_dict)

    def test_duplicate_document_number_is_rejected_per_driver_and_type(self):
        models_module = _load_models_module(self)
        models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000005"),
            document_type=models_module.PersonnelDocument.DocumentType.BUSINESS_REGISTRATION,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Business Registration",
            document_number="BR-2026-001",
        )

        with self.assertRaises(IntegrityError):
            models_module.PersonnelDocument.objects.create(
                driver_id=UUID("10000000-0000-0000-0000-000000000005"),
                document_type=models_module.PersonnelDocument.DocumentType.BUSINESS_REGISTRATION,
                status=models_module.PersonnelDocument.DocumentStatus.DRAFT,
                title="Business Registration Copy",
                document_number="BR-2026-001",
            )
