import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID

from django.core.management import call_command
from django.test import TestCase

from regions.models import Region


class ImportOpsFixtureCommandTests(TestCase):
    def test_imports_regions_from_fixture(self) -> None:
        fixture = {
            "regions": [
                {
                    "region_id": "10000000-0000-0000-0000-000000000001",
                    "region_code": "ops-region-a-1",
                    "name": "Ops Region A-1",
                    "status": "active",
                    "difficulty_level": "medium",
                    "polygon_geojson": {
                        "type": "Polygon",
                        "coordinates": [[[126.9, 37.4], [126.91, 37.4], [126.91, 37.41], [126.9, 37.41], [126.9, 37.4]]],
                    },
                    "description": "Ops Company A / Ops Fleet A-1 운영 권역",
                    "display_order": 1,
                }
            ]
        }

        with TemporaryDirectory() as tmp_dir:
            fixture_path = Path(tmp_dir) / "fixture.json"
            fixture_path.write_text(json.dumps(fixture), encoding="utf-8")

            call_command("import_ops_fixture", fixture=str(fixture_path))

        region = Region.objects.get(region_id=UUID("10000000-0000-0000-0000-000000000001"))
        self.assertEqual(region.region_code, "ops-region-a-1")
        self.assertEqual(region.name, "Ops Region A-1")
