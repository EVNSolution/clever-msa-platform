from django.core.exceptions import ValidationError
from django.test import TestCase

from regions.models import Region


def _polygon():
    return {
        "type": "Polygon",
        "coordinates": [
            [
                [126.97, 37.56],
                [126.99, 37.56],
                [126.99, 37.58],
                [126.97, 37.58],
                [126.97, 37.56],
            ]
        ],
    }


def _multipolygon():
    return {
        "type": "MultiPolygon",
        "coordinates": [
            [
                [
                    [127.01, 37.52],
                    [127.03, 37.52],
                    [127.03, 37.54],
                    [127.01, 37.54],
                    [127.01, 37.52],
                ]
            ]
        ],
    }


class RegionModelTests(TestCase):
    def test_region_accepts_polygon_geojson(self) -> None:
        region = Region(
            region_code="seo-01",
            name="Seoul One",
            status=Region.Status.ACTIVE,
            difficulty_level=Region.DifficultyLevel.MEDIUM,
            polygon_geojson=_polygon(),
        )

        region.full_clean()

    def test_region_accepts_multipolygon_geojson(self) -> None:
        region = Region(
            region_code="seo-02",
            name="Seoul Two",
            status=Region.Status.ACTIVE,
            difficulty_level=Region.DifficultyLevel.HIGH,
            polygon_geojson=_multipolygon(),
        )

        region.full_clean()

    def test_region_code_is_unique(self) -> None:
        Region.objects.create(
            region_code="seo-dup",
            name="Seoul Dup",
            status=Region.Status.ACTIVE,
            difficulty_level=Region.DifficultyLevel.LOW,
            polygon_geojson=_polygon(),
        )
        duplicate = Region(
            region_code="seo-dup",
            name="Seoul Dup Two",
            status=Region.Status.DRAFT,
            difficulty_level=Region.DifficultyLevel.MEDIUM,
            polygon_geojson=_polygon(),
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_region_rejects_non_polygon_geojson(self) -> None:
        region = Region(
            region_code="seo-point",
            name="Seoul Point",
            status=Region.Status.ACTIVE,
            difficulty_level=Region.DifficultyLevel.MEDIUM,
            polygon_geojson={"type": "Point", "coordinates": [127.0, 37.5]},
        )

        with self.assertRaises(ValidationError):
            region.full_clean()
