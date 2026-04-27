import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID

from django.core.management import call_command
from django.test import TestCase

from personneldocuments.models import PersonnelDocument


class ImportOpsFixtureCommandTests(TestCase):
    def test_imports_personnel_documents_from_fixture(self) -> None:
        fixture = {
            "personnel_documents": [
                {
                    "personnel_document_id": "40000000-0000-0000-0000-000000000001",
                    "driver_id": "10000000-0000-0000-0000-000000000001",
                    "document_type": "contract",
                    "status": "active",
                    "title": "Ops Driver A1-01 근로 계약서",
                    "document_number": "OPS-CONTRACT-A101-001",
                    "issuer_name": "Ops HR",
                    "issued_on": "2026-01-01",
                    "expires_on": "2026-12-31",
                    "notes": "Ops-derived fixture contract.",
                    "external_reference": "ops://personnel/contracts/001",
                    "payload": {"signed": True},
                }
            ]
        }

        with TemporaryDirectory() as tmp_dir:
            fixture_path = Path(tmp_dir) / "fixture.json"
            fixture_path.write_text(json.dumps(fixture), encoding="utf-8")

            call_command("import_ops_fixture", fixture=str(fixture_path))

        document = PersonnelDocument.objects.get(
            personnel_document_id=UUID("40000000-0000-0000-0000-000000000001")
        )
        self.assertEqual(document.title, "Ops Driver A1-01 근로 계약서")
        self.assertEqual(document.document_type, PersonnelDocument.DocumentType.CONTRACT)
