from django.core.management import call_command
from django.test import TestCase

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary


class SeedRegionAnalyticsCommandTests(TestCase):
    def test_seed_region_analytics_creates_expected_records_idempotently(self) -> None:
        call_command("seed_region_analytics")
        self.assertEqual(RegionDailyStatistic.objects.count(), 2)
        self.assertEqual(RegionPerformanceSummary.objects.count(), 2)

        call_command("seed_region_analytics")
        self.assertEqual(RegionDailyStatistic.objects.count(), 2)
        self.assertEqual(RegionPerformanceSummary.objects.count(), 2)
