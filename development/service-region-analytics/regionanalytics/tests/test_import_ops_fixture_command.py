import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID

from django.core.management import call_command
from django.test import TestCase

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary


class ImportOpsFixtureCommandTests(TestCase):
    def test_imports_region_analytics_from_fixture(self) -> None:
        fixture = {
            "region_analytics": {
                "daily_statistics": [
                    {
                        "region_daily_statistic_id": "20000000-0000-0000-0000-000000000001",
                        "region_id": "10000000-0000-0000-0000-000000000001",
                        "region_code_snapshot": "ops-region-a-1",
                        "service_date": "2026-04-05",
                        "delivery_count": 42,
                        "completed_delivery_count": 40,
                        "exception_delivery_count": 2,
                        "total_distance_km": "128.50",
                        "total_base_amount": "712000.00",
                        "average_delivery_minutes": "22.50",
                    }
                ],
                "performance_summaries": [
                    {
                        "region_performance_summary_id": "30000000-0000-0000-0000-000000000001",
                        "region_id": "10000000-0000-0000-0000-000000000001",
                        "region_code_snapshot": "ops-region-a-1",
                        "difficulty_level_snapshot": "medium",
                        "period_start": "2026-04-01",
                        "period_end": "2026-04-05",
                        "delivery_count": 180,
                        "completion_rate": "94.50",
                        "productivity_score": "61.20",
                        "cost_per_delivery": "3955.55",
                        "notes": "Ops Region A-1 synthetic summary",
                    }
                ],
            }
        }

        with TemporaryDirectory() as tmp_dir:
            fixture_path = Path(tmp_dir) / "fixture.json"
            fixture_path.write_text(json.dumps(fixture), encoding="utf-8")

            call_command("import_ops_fixture", fixture=str(fixture_path))

        daily = RegionDailyStatistic.objects.get(
            region_daily_statistic_id=UUID("20000000-0000-0000-0000-000000000001")
        )
        summary = RegionPerformanceSummary.objects.get(
            region_performance_summary_id=UUID("30000000-0000-0000-0000-000000000001")
        )
        self.assertEqual(daily.region_code_snapshot, "ops-region-a-1")
        self.assertEqual(summary.delivery_count, 180)
