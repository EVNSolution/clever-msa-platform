from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

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


class RegionApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin", allowed_nav_keys=["regions"])
        self.user_token = self._issue_token("user", allowed_nav_keys=[])

    def _issue_token(self, role: str, *, allowed_nav_keys: list[str] | None = None) -> str:
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

    def _payload(self, *, region_code: str = "seo-central", difficulty_level: str = "medium"):
        return {
            "region_code": region_code,
            "name": region_code.replace("-", " ").title(),
            "status": "active",
            "difficulty_level": difficulty_level,
            "polygon_geojson": _polygon(),
            "description": "Seed region",
            "display_order": 10,
        }

    def _create_region(
        self,
        *,
        region_code: str,
        status: str = Region.Status.ACTIVE,
        difficulty_level: str = Region.DifficultyLevel.MEDIUM,
    ) -> Region:
        return Region.objects.create(
            region_code=region_code,
            name=region_code.replace("-", " ").title(),
            status=status,
            difficulty_level=difficulty_level,
            polygon_geojson=_polygon(),
            display_order=10,
        )

    def test_health_endpoint_responds_publicly(self) -> None:
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_unauthenticated_region_list_returns_401_shape(self) -> None:
        response = self.client.get("/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_authenticated_non_admin_cannot_manage_regions(self) -> None:
        region = self._create_region(region_code="seo-one")
        self._authenticate(self.user_token)

        list_response = self.client.get("/")
        create_response = self.client.post("/", self._payload(region_code="seo-two"), format="json")
        patch_response = self.client.patch(
            f"/{region.region_id}/",
            {"name": "Changed"},
            format="json",
        )

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(patch_response.status_code, 403)

    def test_admin_can_crud_regions(self) -> None:
        self._authenticate(self.admin_token)

        create_response = self.client.post("/", self._payload(), format="json")
        self.assertEqual(create_response.status_code, 201)
        region_id = create_response.data["region_id"]

        detail_response = self.client.get(f"/{region_id}/")
        self.assertEqual(detail_response.status_code, 200)

        patch_response = self.client.patch(
            f"/{region_id}/",
            {"difficulty_level": "high"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["difficulty_level"], "high")

    def test_region_list_filters_by_status_difficulty_and_region_code(self) -> None:
        self._create_region(region_code="seo-active", status=Region.Status.ACTIVE, difficulty_level=Region.DifficultyLevel.HIGH)
        self._create_region(region_code="seo-draft", status=Region.Status.DRAFT, difficulty_level=Region.DifficultyLevel.LOW)
        self._authenticate(self.admin_token)

        by_status = self.client.get("/", {"status": "active"})
        by_difficulty = self.client.get("/", {"difficulty_level": "high"})
        by_region_code = self.client.get("/", {"region_code": "seo-draft"})

        self.assertEqual(len(by_status.data), 1)
        self.assertEqual(by_status.data[0]["region_code"], "seo-active")
        self.assertEqual(len(by_difficulty.data), 1)
        self.assertEqual(by_difficulty.data[0]["region_code"], "seo-active")
        self.assertEqual(len(by_region_code.data), 1)
        self.assertEqual(by_region_code.data[0]["region_code"], "seo-draft")

    def test_invalid_polygon_payload_is_rejected(self) -> None:
        payload = self._payload(region_code="seo-invalid")
        payload["polygon_geojson"] = {"type": "Point", "coordinates": [127.0, 37.5]}
        self._authenticate(self.admin_token)

        response = self.client.post("/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("polygon_geojson", response.data["details"])

    def test_admin_without_regions_nav_key_cannot_list_regions(self) -> None:
        self._authenticate(self._issue_token("admin", allowed_nav_keys=[]))

        response = self.client.get("/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_without_regions_nav_key_cannot_read_region_detail(self) -> None:
        region = self._create_region(region_code="seo-blocked")
        self._authenticate(self._issue_token("admin", allowed_nav_keys=[]))

        response = self.client.get(f"/{region.region_id}/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
