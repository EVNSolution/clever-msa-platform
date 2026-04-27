from datetime import date
from decimal import Decimal
from uuid import UUID

from django.core.management.base import BaseCommand

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary

REGION_CENTRAL_ID = UUID("91000000-0000-0000-0000-000000000001")
REGION_RIVERSIDE_ID = UUID("91000000-0000-0000-0000-000000000002")

CENTRAL_DAILY_STAT_ID = UUID("94000000-0000-0000-0000-000000000001")
RIVERSIDE_DAILY_STAT_ID = UUID("94000000-0000-0000-0000-000000000002")
CENTRAL_PERFORMANCE_ID = UUID("94000000-0000-0000-0000-000000000101")
RIVERSIDE_PERFORMANCE_ID = UUID("94000000-0000-0000-0000-000000000102")


class Command(BaseCommand):
    help = "Seed deterministic region analytics bootstrap data."

    def handle(self, *args, **options):
        RegionDailyStatistic.objects.update_or_create(
            region_daily_statistic_id=CENTRAL_DAILY_STAT_ID,
            defaults={
                "region_id": REGION_CENTRAL_ID,
                "region_code_snapshot": "seo-central",
                "service_date": date(2026, 3, 25),
                "delivery_count": 120,
                "completed_delivery_count": 114,
                "exception_delivery_count": 3,
                "total_distance_km": Decimal("248.40"),
                "total_base_amount": Decimal("1180000.00"),
                "average_delivery_minutes": Decimal("17.50"),
            },
        )
        RegionDailyStatistic.objects.update_or_create(
            region_daily_statistic_id=RIVERSIDE_DAILY_STAT_ID,
            defaults={
                "region_id": REGION_RIVERSIDE_ID,
                "region_code_snapshot": "seo-riverside",
                "service_date": date(2026, 3, 25),
                "delivery_count": 98,
                "completed_delivery_count": 87,
                "exception_delivery_count": 6,
                "total_distance_km": Decimal("276.10"),
                "total_base_amount": Decimal("1040000.00"),
                "average_delivery_minutes": Decimal("21.30"),
            },
        )
        RegionPerformanceSummary.objects.update_or_create(
            region_performance_summary_id=CENTRAL_PERFORMANCE_ID,
            defaults={
                "region_id": REGION_CENTRAL_ID,
                "region_code_snapshot": "seo-central",
                "difficulty_level_snapshot": RegionPerformanceSummary.DifficultyLevel.MEDIUM,
                "period_start": date(2026, 3, 1),
                "period_end": date(2026, 3, 25),
                "delivery_count": 2810,
                "completion_rate": Decimal("95.20"),
                "productivity_score": Decimal("88.40"),
                "cost_per_delivery": Decimal("9800.00"),
                "notes": "Stable baseline region performance.",
            },
        )
        RegionPerformanceSummary.objects.update_or_create(
            region_performance_summary_id=RIVERSIDE_PERFORMANCE_ID,
            defaults={
                "region_id": REGION_RIVERSIDE_ID,
                "region_code_snapshot": "seo-riverside",
                "difficulty_level_snapshot": RegionPerformanceSummary.DifficultyLevel.HIGH,
                "period_start": date(2026, 3, 1),
                "period_end": date(2026, 3, 25),
                "delivery_count": 2330,
                "completion_rate": Decimal("88.70"),
                "productivity_score": Decimal("79.10"),
                "cost_per_delivery": Decimal("11200.00"),
                "notes": "Higher complexity region with lower efficiency.",
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded region analytics bootstrap data."))
