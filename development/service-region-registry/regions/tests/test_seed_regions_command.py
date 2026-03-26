from django.core.management import call_command
from django.test import TestCase

from regions.models import Region


class SeedRegionsCommandTests(TestCase):
    def test_seed_regions_creates_expected_regions_idempotently(self) -> None:
        call_command("seed_regions")
        self.assertEqual(Region.objects.count(), 2)

        polygon_types = {region.polygon_geojson["type"] for region in Region.objects.all()}
        self.assertEqual(polygon_types, {"Polygon", "MultiPolygon"})

        call_command("seed_regions")
        self.assertEqual(Region.objects.count(), 2)
