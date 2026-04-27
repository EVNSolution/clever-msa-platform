from decimal import Decimal
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary


class RegionDailyStatisticModelTests(TestCase):
    def test_daily_statistic_accepts_basic_fields(self) -> None:
        statistic = RegionDailyStatistic(
            region_id=uuid4(),
            region_code_snapshot="seo-central",
            service_date="2026-03-25",
            delivery_count=100,
            completed_delivery_count=96,
            exception_delivery_count=2,
            total_distance_km=Decimal("190.50"),
            total_base_amount=Decimal("880000.00"),
            average_delivery_minutes=Decimal("18.20"),
        )

        statistic.full_clean()

    def test_daily_statistic_rejects_completed_count_above_delivery_count(self) -> None:
        statistic = RegionDailyStatistic(
            region_id=uuid4(),
            region_code_snapshot="seo-central",
            service_date="2026-03-25",
            delivery_count=10,
            completed_delivery_count=11,
            exception_delivery_count=0,
            total_distance_km=Decimal("10.00"),
            total_base_amount=Decimal("10000.00"),
            average_delivery_minutes=Decimal("15.00"),
        )

        with self.assertRaises(ValidationError):
            statistic.full_clean()

    def test_daily_statistic_is_unique_per_region_and_date(self) -> None:
        region_id = uuid4()
        RegionDailyStatistic.objects.create(
            region_id=region_id,
            region_code_snapshot="seo-central",
            service_date="2026-03-25",
            delivery_count=10,
            completed_delivery_count=9,
            exception_delivery_count=0,
            total_distance_km=Decimal("10.00"),
            total_base_amount=Decimal("10000.00"),
            average_delivery_minutes=Decimal("15.00"),
        )

        with self.assertRaises(IntegrityError):
            RegionDailyStatistic.objects.create(
                region_id=region_id,
                region_code_snapshot="seo-central",
                service_date="2026-03-25",
                delivery_count=12,
                completed_delivery_count=11,
                exception_delivery_count=1,
                total_distance_km=Decimal("12.00"),
                total_base_amount=Decimal("12000.00"),
                average_delivery_minutes=Decimal("16.00"),
            )


class RegionPerformanceSummaryModelTests(TestCase):
    def test_performance_summary_accepts_basic_fields(self) -> None:
        summary = RegionPerformanceSummary(
            region_id=uuid4(),
            region_code_snapshot="seo-central",
            difficulty_level_snapshot=RegionPerformanceSummary.DifficultyLevel.MEDIUM,
            period_start="2026-03-01",
            period_end="2026-03-25",
            delivery_count=1000,
            completion_rate=Decimal("95.30"),
            productivity_score=Decimal("88.20"),
            cost_per_delivery=Decimal("9800.00"),
        )

        summary.full_clean()

    def test_performance_summary_rejects_invalid_period_order(self) -> None:
        summary = RegionPerformanceSummary(
            region_id=uuid4(),
            region_code_snapshot="seo-central",
            difficulty_level_snapshot=RegionPerformanceSummary.DifficultyLevel.HIGH,
            period_start="2026-03-26",
            period_end="2026-03-25",
            delivery_count=1000,
            completion_rate=Decimal("91.00"),
            productivity_score=Decimal("77.20"),
            cost_per_delivery=Decimal("10500.00"),
        )

        with self.assertRaises(ValidationError):
            summary.full_clean()
