import json
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary


class Command(BaseCommand):
    help = "Import the region analytics sections from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        analytics_payload = payload.get("region_analytics", {})
        imported_daily = 0
        imported_summaries = 0

        with transaction.atomic():
            for daily_payload in analytics_payload.get("daily_statistics", []):
                RegionDailyStatistic.objects.update_or_create(
                    region_daily_statistic_id=UUID(daily_payload["region_daily_statistic_id"]),
                    defaults={
                        "region_id": UUID(daily_payload["region_id"]),
                        "region_code_snapshot": daily_payload["region_code_snapshot"],
                        "service_date": parse_date(daily_payload["service_date"]),
                        "delivery_count": daily_payload["delivery_count"],
                        "completed_delivery_count": daily_payload["completed_delivery_count"],
                        "exception_delivery_count": daily_payload["exception_delivery_count"],
                        "total_distance_km": daily_payload["total_distance_km"],
                        "total_base_amount": daily_payload["total_base_amount"],
                        "average_delivery_minutes": daily_payload["average_delivery_minutes"],
                    },
                )
                imported_daily += 1

            for summary_payload in analytics_payload.get("performance_summaries", []):
                RegionPerformanceSummary.objects.update_or_create(
                    region_performance_summary_id=UUID(summary_payload["region_performance_summary_id"]),
                    defaults={
                        "region_id": UUID(summary_payload["region_id"]),
                        "region_code_snapshot": summary_payload["region_code_snapshot"],
                        "difficulty_level_snapshot": summary_payload["difficulty_level_snapshot"],
                        "period_start": parse_date(summary_payload["period_start"]),
                        "period_end": parse_date(summary_payload["period_end"]),
                        "delivery_count": summary_payload["delivery_count"],
                        "completion_rate": summary_payload["completion_rate"],
                        "productivity_score": summary_payload["productivity_score"],
                        "cost_per_delivery": summary_payload["cost_per_delivery"],
                        "notes": summary_payload["notes"],
                    },
                )
                imported_summaries += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported ops-derived region analytics fixture ({imported_daily} daily stats, {imported_summaries} summaries)."
            )
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
