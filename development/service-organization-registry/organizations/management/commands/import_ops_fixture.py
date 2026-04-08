import json
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from organizations.models import Company, Fleet


class Command(BaseCommand):
    help = "Import the organizations section from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        companies = payload.get("organizations", [])
        company_count = 0
        fleet_count = 0

        with transaction.atomic():
            for company_payload in companies:
                company, _ = Company.objects.update_or_create(
                    company_id=UUID(company_payload["company_id"]),
                    defaults={"name": company_payload["name"]},
                )
                company_count += 1
                for fleet_payload in company_payload.get("fleets", []):
                    Fleet.objects.update_or_create(
                        fleet_id=UUID(fleet_payload["fleet_id"]),
                        defaults={
                            "company_id": company.company_id,
                            "name": fleet_payload["name"],
                        },
                    )
                    fleet_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported ops-derived organization fixture ({company_count} companies, {fleet_count} fleets)."
            )
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
