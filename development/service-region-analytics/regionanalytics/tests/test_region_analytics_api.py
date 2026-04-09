from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary


class RegionAnalyticsApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin")
        self.user_token = self._issue_token("user")

    def _issue_token(self, role: str, allowed_nav_keys: list[str] | None = None) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(uuid4()),
            "email": f"{role}@example.com",
            "role": role,
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "jti": str(uuid4()),
            "type": "access",
        }
        if allowed_nav_keys is not None:
            payload["allowed_nav_keys"] = allowed_nav_keys
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _authenticate_admin_with_nav_keys(self, *allowed_nav_keys: str) -> None:
        self._authenticate(self._issue_token("admin", list(allowed_nav_keys)))

    def _daily_payload(self, *, region_code_snapshot: str = "seo-central") -> dict:
        return {
            "region_id": str(uuid4()),
            "region_code_snapshot": region_code_snapshot,
            "service_date": "2026-03-25",
            "delivery_count": 110,
            "completed_delivery_count": 103,
            "exception_delivery_count": 2,
            "total_distance_km": "211.40",
            "total_base_amount": "1040000.00",
            "average_delivery_minutes": "18.50",
        }

    def _performance_payload(self, *, region_code_snapshot: str = "seo-central") -> dict:
        return {
            "region_id": str(uuid4()),
            "region_code_snapshot": region_code_snapshot,
            "difficulty_level_snapshot": "medium",
            "period_start": "2026-03-01",
            "period_end": "2026-03-25",
            "delivery_count": 2400,
            "completion_rate": "94.10",
            "productivity_score": "86.30",
            "cost_per_delivery": "9800.00",
            "notes": "Stable region",
        }

    def _create_daily_statistic(
        self,
        *,
        region_id,
        region_code_snapshot: str,
        service_date: str = "2026-03-25",
    ) -> RegionDailyStatistic:
        return RegionDailyStatistic.objects.create(
            region_id=region_id,
            region_code_snapshot=region_code_snapshot,
            service_date=service_date,
            delivery_count=120,
            completed_delivery_count=114,
            exception_delivery_count=3,
            total_distance_km=Decimal("248.40"),
            total_base_amount=Decimal("1180000.00"),
            average_delivery_minutes=Decimal("17.50"),
        )

    def _create_performance_summary(
        self,
        *,
        region_id,
        region_code_snapshot: str,
        difficulty_level_snapshot: str = "medium",
    ) -> RegionPerformanceSummary:
        return RegionPerformanceSummary.objects.create(
            region_id=region_id,
            region_code_snapshot=region_code_snapshot,
            difficulty_level_snapshot=difficulty_level_snapshot,
            period_start="2026-03-01",
            period_end="2026-03-25",
            delivery_count=2400,
            completion_rate=Decimal("94.10"),
            productivity_score=Decimal("86.30"),
            cost_per_delivery=Decimal("9800.00"),
            notes="Stable region",
        )

    def test_health_endpoint_responds_publicly(self) -> None:
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_unauthenticated_daily_statistics_list_returns_401_shape(self) -> None:
        response = self.client.get("/daily-statistics/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_authenticated_non_admin_cannot_manage_region_analytics(self) -> None:
        daily_statistic = self._create_daily_statistic(region_id=uuid4(), region_code_snapshot="seo-central")
        performance_summary = self._create_performance_summary(
            region_id=uuid4(),
            region_code_snapshot="seo-central",
        )
        self._authenticate(self.user_token)

        list_response = self.client.get("/daily-statistics/")
        create_response = self.client.post("/daily-statistics/", self._daily_payload(), format="json")
        patch_daily = self.client.patch(
            f"/daily-statistics/{daily_statistic.region_daily_statistic_id}/",
            {"delivery_count": 90},
            format="json",
        )
        patch_summary = self.client.patch(
            f"/performance-summaries/{performance_summary.region_performance_summary_id}/",
            {"notes": "Changed"},
            format="json",
        )

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(patch_daily.status_code, 403)
        self.assertEqual(patch_summary.status_code, 403)

    def test_admin_can_crud_daily_statistics_and_performance_summaries(self) -> None:
        self._authenticate(self.admin_token)

        create_daily = self.client.post("/daily-statistics/", self._daily_payload(), format="json")
        self.assertEqual(create_daily.status_code, 201)
        daily_statistic_id = create_daily.data["region_daily_statistic_id"]

        create_summary = self.client.post(
            "/performance-summaries/",
            self._performance_payload(),
            format="json",
        )
        self.assertEqual(create_summary.status_code, 201)
        summary_id = create_summary.data["region_performance_summary_id"]

        daily_detail = self.client.get(f"/daily-statistics/{daily_statistic_id}/")
        summary_detail = self.client.get(f"/performance-summaries/{summary_id}/")
        self.assertEqual(daily_detail.status_code, 200)
        self.assertEqual(summary_detail.status_code, 200)

        patch_daily = self.client.patch(
            f"/daily-statistics/{daily_statistic_id}/",
            {"completed_delivery_count": 105},
            format="json",
        )
        patch_summary = self.client.patch(
            f"/performance-summaries/{summary_id}/",
            {"notes": "Updated"},
            format="json",
        )
        self.assertEqual(patch_daily.status_code, 200)
        self.assertEqual(patch_daily.data["completed_delivery_count"], 105)
        self.assertEqual(patch_summary.status_code, 200)
        self.assertEqual(patch_summary.data["notes"], "Updated")

    def test_list_filters_work_for_daily_statistics_and_performance_summaries(self) -> None:
        region_one = uuid4()
        region_two = uuid4()
        self._create_daily_statistic(region_id=region_one, region_code_snapshot="seo-central", service_date="2026-03-25")
        self._create_daily_statistic(region_id=region_two, region_code_snapshot="seo-riverside", service_date="2026-03-26")
        self._create_performance_summary(
            region_id=region_one,
            region_code_snapshot="seo-central",
            difficulty_level_snapshot="medium",
        )
        self._create_performance_summary(
            region_id=region_two,
            region_code_snapshot="seo-riverside",
            difficulty_level_snapshot="high",
        )
        self._authenticate(self.admin_token)

        daily_by_code = self.client.get("/daily-statistics/", {"region_code_snapshot": "seo-riverside"})
        daily_by_date = self.client.get("/daily-statistics/", {"service_date": "2026-03-25"})
        summary_by_difficulty = self.client.get(
            "/performance-summaries/",
            {"difficulty_level_snapshot": "high"},
        )
        summary_by_period = self.client.get("/performance-summaries/", {"period_start": "2026-03-01"})

        self.assertEqual(len(daily_by_code.data), 1)
        self.assertEqual(daily_by_code.data[0]["region_code_snapshot"], "seo-riverside")
        self.assertEqual(len(daily_by_date.data), 1)
        self.assertEqual(daily_by_date.data[0]["service_date"], "2026-03-25")
        self.assertEqual(len(summary_by_difficulty.data), 1)
        self.assertEqual(summary_by_difficulty.data[0]["difficulty_level_snapshot"], "high")
        self.assertEqual(len(summary_by_period.data), 2)

    def test_invalid_daily_statistics_payload_is_rejected(self) -> None:
        payload = self._daily_payload(region_code_snapshot="seo-invalid")
        payload["completed_delivery_count"] = 120
        self._authenticate(self.admin_token)

        response = self.client.post("/daily-statistics/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("completed_delivery_count", response.data["details"])

    def test_admin_without_regions_nav_key_is_denied(self) -> None:
        self._authenticate_admin_with_nav_keys("vehicles")

        self.assertEqual(self.client.get("/daily-statistics/").status_code, 403)
        self.assertEqual(self.client.get("/performance-summaries/").status_code, 403)

    def test_admin_with_regions_nav_key_can_read(self) -> None:
        self._authenticate_admin_with_nav_keys("regions")

        self.assertEqual(self.client.get("/daily-statistics/").status_code, 200)
        self.assertEqual(self.client.get("/performance-summaries/").status_code, 200)
