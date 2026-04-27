from uuid import UUID

from django.core.management.base import BaseCommand

from regions.models import Region

SAMPLE_REGION_POLYGON_ID = UUID("91000000-0000-0000-0000-000000000001")
SAMPLE_REGION_MULTIPOLYGON_ID = UUID("91000000-0000-0000-0000-000000000002")


class Command(BaseCommand):
    help = "Seed deterministic region registry bootstrap data."

    def handle(self, *args, **options):
        Region.objects.update_or_create(
            region_id=SAMPLE_REGION_POLYGON_ID,
            defaults={
                "region_code": "seo-central",
                "name": "Seoul Central",
                "status": Region.Status.ACTIVE,
                "difficulty_level": Region.DifficultyLevel.MEDIUM,
                "polygon_geojson": {
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
                },
                "description": "Seeded central region.",
                "display_order": 10,
            },
        )
        Region.objects.update_or_create(
            region_id=SAMPLE_REGION_MULTIPOLYGON_ID,
            defaults={
                "region_code": "seo-riverside",
                "name": "Seoul Riverside",
                "status": Region.Status.ACTIVE,
                "difficulty_level": Region.DifficultyLevel.HIGH,
                "polygon_geojson": {
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
                        ],
                        [
                            [
                                [127.04, 37.525],
                                [127.05, 37.525],
                                [127.05, 37.535],
                                [127.04, 37.535],
                                [127.04, 37.525],
                            ]
                        ],
                    ],
                },
                "description": "Seeded riverside region.",
                "display_order": 20,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded region registry bootstrap data."))
