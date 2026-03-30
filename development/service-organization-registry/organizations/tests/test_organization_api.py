from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient


class OrganizationApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin")
        self.user_token = self._issue_token("user")

    def _issue_token(self, role: str) -> str:
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
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    def test_admin_can_crud_company_and_fleet(self):
        self._authenticate(self.admin_token)

        company_response = self.client.post("/companies/", {"name": "Seed Company"}, format="json")
        self.assertEqual(company_response.status_code, 201)
        company_id = company_response.data["company_id"]
        company_ref = company_response.data["route_no"]

        fleet_response = self.client.post(
            "/fleets/",
            {"name": "Seed Fleet", "company_id": company_id},
            format="json",
        )
        self.assertEqual(fleet_response.status_code, 201)
        fleet_id = fleet_response.data["fleet_id"]
        fleet_ref = fleet_response.data["route_no"]

        self.assertEqual(self.client.get(f"/companies/{company_ref}/").status_code, 200)
        self.assertEqual(self.client.get(f"/fleets/{fleet_ref}/").status_code, 200)
        self.assertEqual(self.client.get(f"/companies/{company_id}/").status_code, 200)
        self.assertEqual(self.client.get(f"/fleets/{fleet_id}/").status_code, 200)

        self.assertEqual(
            self.client.patch(
                f"/companies/{company_ref}/",
                {"name": "Updated Company"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(
                f"/fleets/{fleet_ref}/",
                {"name": "Updated Fleet"},
                format="json",
            ).status_code,
            200,
        )

        self.assertEqual(self.client.delete(f"/fleets/{fleet_ref}/").status_code, 204)
        self.assertEqual(self.client.delete(f"/companies/{company_ref}/").status_code, 204)

    def test_org_unit_endpoints_are_not_exposed(self):
        self._authenticate(self.admin_token)

        response = self.client.get("/org-units/")

        self.assertEqual(response.status_code, 404)

    def test_user_cannot_write_organization_resources(self):
        self._authenticate(self.user_token)

        response = self.client.post("/companies/", {"name": "Nope"}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_unauthenticated_read_returns_401_shape(self):
        response = self.client.get("/companies/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_missing_resource_returns_404_shape(self):
        self._authenticate(self.admin_token)

        response = self.client.get("/companies/999999/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
