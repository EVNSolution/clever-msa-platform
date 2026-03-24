from datetime import date
from importlib import import_module
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

    def test_invalid_date_range_is_rejected_at_database_level(self):
        models_module = _load_models_module(self)

        with self.assertRaises(IntegrityError):
            models_module.PersonnelDocument.objects.create(
                driver_id=UUID("10000000-0000-0000-0000-000000000004"),
                document_type=models_module.PersonnelDocument.DocumentType.BANK_ACCOUNT_PROOF,
                status=models_module.PersonnelDocument.DocumentStatus.DRAFT,
                title="Invalid Bank Proof",
                issued_on=date(2026, 3, 24),
                expires_on=date(2026, 3, 23),
            )

    def test_date_range_allows_equal_dates_and_null_boundaries(self):
        models_module = _load_models_module(self)

        same_day = models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000004"),
            document_type=models_module.PersonnelDocument.DocumentType.BANK_ACCOUNT_PROOF,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Same Day Bank Proof",
            issued_on=date(2026, 3, 24),
            expires_on=date(2026, 3, 24),
        )
        issued_only = models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000014"),
            document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Issued Only Contract",
            issued_on=date(2026, 3, 24),
            expires_on=None,
        )
        expires_only = models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000015"),
            document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Expires Only Contract",
            issued_on=None,
            expires_on=date(2026, 3, 24),
        )

        self.assertEqual(same_day.expires_on, same_day.issued_on)
        self.assertIsNone(issued_only.expires_on)
        self.assertIsNone(expires_only.issued_on)

    def test_invalid_document_type_is_rejected_at_database_level(self):
        models_module = _load_models_module(self)

        with self.assertRaises(IntegrityError):
            models_module.PersonnelDocument.objects.create(
                driver_id=UUID("10000000-0000-0000-0000-000000000016"),
                document_type="passport",
                status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
                title="Unsupported Document Type",
            )

    def test_invalid_status_is_rejected_at_database_level(self):
        models_module = _load_models_module(self)

        with self.assertRaises(IntegrityError):
            models_module.PersonnelDocument.objects.create(
                driver_id=UUID("10000000-0000-0000-0000-000000000017"),
                document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
                status="pending",
                title="Unsupported Status",
            )

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

    def test_blank_document_number_does_not_trigger_unique_constraint(self):
        models_module = _load_models_module(self)
        driver_id = UUID("10000000-0000-0000-0000-000000000006")

        models_module.PersonnelDocument.objects.create(
            driver_id=driver_id,
            document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Primary Contract",
            document_number="",
        )

        duplicate_blank = models_module.PersonnelDocument(
            driver_id=driver_id,
            document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
            status=models_module.PersonnelDocument.DocumentStatus.DRAFT,
            title="Draft Contract",
            document_number="",
        )

        duplicate_blank.full_clean()
        duplicate_blank.save()

        self.assertEqual(
            models_module.PersonnelDocument.objects.filter(
                driver_id=driver_id,
                document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
                document_number="",
            ).count(),
            2,
        )

    def test_none_document_number_does_not_trigger_unique_constraint(self):
        models_module = _load_models_module(self)
        driver_id = UUID("10000000-0000-0000-0000-000000000007")

        models_module.PersonnelDocument.objects.create(
            driver_id=driver_id,
            document_type=models_module.PersonnelDocument.DocumentType.LICENSE_OR_CERTIFICATE,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Primary Certificate",
            document_number=None,
        )
        models_module.PersonnelDocument.objects.create(
            driver_id=driver_id,
            document_type=models_module.PersonnelDocument.DocumentType.LICENSE_OR_CERTIFICATE,
            status=models_module.PersonnelDocument.DocumentStatus.DRAFT,
            title="Secondary Certificate",
            document_number=None,
        )

        self.assertEqual(
            models_module.PersonnelDocument.objects.filter(
                driver_id=driver_id,
                document_type=models_module.PersonnelDocument.DocumentType.LICENSE_OR_CERTIFICATE,
                document_number__isnull=True,
            ).count(),
            2,
        )

    def test_same_document_number_is_allowed_across_different_driver_or_type(self):
        models_module = _load_models_module(self)
        document_number = "SHARED-2026-001"

        models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000008"),
            document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Driver 8 Contract",
            document_number=document_number,
        )
        models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000009"),
            document_type=models_module.PersonnelDocument.DocumentType.CONTRACT,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Driver 9 Contract",
            document_number=document_number,
        )
        models_module.PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000008"),
            document_type=models_module.PersonnelDocument.DocumentType.BUSINESS_REGISTRATION,
            status=models_module.PersonnelDocument.DocumentStatus.ACTIVE,
            title="Driver 8 Business Registration",
            document_number=document_number,
        )

        self.assertEqual(
            models_module.PersonnelDocument.objects.filter(document_number=document_number).count(),
            3,
        )
