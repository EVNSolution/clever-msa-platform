import json
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from regions.models import Region


class Command(BaseCommand):
    help = "Import the regions section from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        regions = payload.get("regions", [])
        imported = 0

        with transaction.atomic():
            for region_payload in regions:
                Region.objects.update_or_create(
                    region_id=UUID(region_payload["region_id"]),
                    defaults={
                        "region_code": region_payload["region_code"],
                        "name": region_payload["name"],
                        "status": region_payload["status"],
                        "difficulty_level": region_payload["difficulty_level"],
                        "polygon_geojson": region_payload["polygon_geojson"],
                        "description": region_payload["description"],
                        "display_order": region_payload["display_order"],
                    },
                )
                imported += 1

        self.stdout.write(
            self.style.SUCCESS(f"Imported ops-derived region fixture ({imported} regions).")
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
