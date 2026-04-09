from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from announcements.models import Announcement


class AnnouncementApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin")
        self.user_token = self._issue_token("user")

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

    def _payload(
        self,
        *,
        slug: str = "ops-update",
        status: str = Announcement.Status.PUBLISHED,
        exposure_scope: str = Announcement.ExposureScope.OPERATOR,
    ):
        return {
            "slug": slug,
            "title": slug.replace("-", " ").title(),
            "body": "Announcement body",
            "status": status,
            "exposure_scope": exposure_scope,
            "published_at": "2026-03-01T00:00:00Z" if status == Announcement.Status.PUBLISHED else None,
            "expires_at": "2026-04-01T00:00:00Z" if status == Announcement.Status.PUBLISHED else None,
            "is_pinned": status == Announcement.Status.PUBLISHED,
            "display_order": 10,
        }

    def _create_announcement(
        self,
        *,
        slug: str,
        status: str = Announcement.Status.PUBLISHED,
        exposure_scope: str = Announcement.ExposureScope.ALL,
    ) -> Announcement:
        return Announcement.objects.create(
            slug=slug,
            title=slug.replace("-", " ").title(),
            body="Announcement body",
            status=status,
            exposure_scope=exposure_scope,
            published_at=datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc) if status == Announcement.Status.PUBLISHED else None,
            expires_at=datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc) if status == Announcement.Status.PUBLISHED else None,
            display_order=10,
        )

    def test_health_endpoint_responds_publicly(self) -> None:
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_unauthenticated_announcement_list_returns_401_shape(self) -> None:
        response = self.client.get("/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_authenticated_non_admin_cannot_create_or_update_announcements(self) -> None:
        announcement = self._create_announcement(slug="ops-one")
        self._authenticate(self.user_token)

        list_response = self.client.get("/")
        create_response = self.client.post("/", self._payload(slug="ops-two"), format="json")
        patch_response = self.client.patch(
            f"/{announcement.announcement_id}/",
            {"title": "Changed"},
            format="json",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(patch_response.status_code, 403)

    def test_authenticated_non_admin_can_read_published_operator_announcements_only(self) -> None:
        self._create_announcement(
            slug="ops-all",
            status=Announcement.Status.PUBLISHED,
            exposure_scope=Announcement.ExposureScope.ALL,
        )
        self._create_announcement(
            slug="ops-operator",
            status=Announcement.Status.PUBLISHED,
            exposure_scope=Announcement.ExposureScope.OPERATOR,
        )
        self._create_announcement(
            slug="ops-driver",
            status=Announcement.Status.PUBLISHED,
            exposure_scope=Announcement.ExposureScope.DRIVER,
        )
        self._create_announcement(
            slug="ops-draft",
            status=Announcement.Status.DRAFT,
            exposure_scope=Announcement.ExposureScope.OPERATOR,
        )
        self._authenticate(self.user_token)

        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["slug"] for item in response.data], ["ops-all", "ops-operator"])

    def test_admin_without_announcements_nav_key_is_denied(self) -> None:
        self._create_announcement(slug="ops-one")
        self._authenticate(self._issue_token("admin", allowed_nav_keys=[]))

        response = self.client.get("/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["message"], "This API is not allowed by current navigation policy.")

    def test_admin_can_crud_announcements(self) -> None:
        self._authenticate(self.admin_token)

        create_response = self.client.post("/", self._payload(), format="json")
        self.assertEqual(create_response.status_code, 201)
        announcement_id = create_response.data["announcement_id"]

        detail_response = self.client.get(f"/{announcement_id}/")
        self.assertEqual(detail_response.status_code, 200)

        patch_response = self.client.patch(
            f"/{announcement_id}/",
            {"status": "archived"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["status"], "archived")

    def test_announcement_list_filters_by_status_scope_and_slug(self) -> None:
        self._create_announcement(
            slug="ops-active",
            status=Announcement.Status.PUBLISHED,
            exposure_scope=Announcement.ExposureScope.OPERATOR,
        )
        self._create_announcement(
            slug="driver-draft",
            status=Announcement.Status.DRAFT,
            exposure_scope=Announcement.ExposureScope.DRIVER,
        )
        self._authenticate(self.admin_token)

        by_status = self.client.get("/", {"status": "published"})
        by_scope = self.client.get("/", {"exposure_scope": "driver"})
        by_slug = self.client.get("/", {"slug": "driver-draft"})

        self.assertEqual(len(by_status.data), 1)
        self.assertEqual(by_status.data[0]["slug"], "ops-active")
        self.assertEqual(len(by_scope.data), 1)
        self.assertEqual(by_scope.data[0]["slug"], "driver-draft")
        self.assertEqual(len(by_slug.data), 1)
        self.assertEqual(by_slug.data[0]["slug"], "driver-draft")

    def test_invalid_publish_payload_is_rejected(self) -> None:
        payload = self._payload(slug="ops-invalid")
        payload["published_at"] = None
        self._authenticate(self.admin_token)

        response = self.client.post("/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("published_at", response.data["details"])
