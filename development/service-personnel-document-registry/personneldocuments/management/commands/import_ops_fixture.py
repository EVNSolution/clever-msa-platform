import json
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date

from personneldocuments.models import PersonnelDocument


class Command(BaseCommand):
    help = "Import the personnel_documents section from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        documents = payload.get("personnel_documents", [])
        imported = 0

        with transaction.atomic():
            for document_payload in documents:
                PersonnelDocument.objects.update_or_create(
                    personnel_document_id=UUID(document_payload["personnel_document_id"]),
                    defaults={
                        "driver_id": UUID(document_payload["driver_id"]),
                        "document_type": document_payload["document_type"],
                        "status": document_payload["status"],
                        "title": document_payload["title"],
                        "document_number": document_payload["document_number"],
                        "issuer_name": document_payload["issuer_name"],
                        "issued_on": parse_date(document_payload["issued_on"]) if document_payload.get("issued_on") else None,
                        "expires_on": parse_date(document_payload["expires_on"]) if document_payload.get("expires_on") else None,
                        "notes": document_payload["notes"],
                        "external_reference": document_payload["external_reference"],
                        "payload": document_payload["payload"],
                    },
                )
                imported += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported ops-derived personnel document fixture ({imported} documents)."
            )
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
