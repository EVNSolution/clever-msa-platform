from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient


class OrganizationApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin", allowed_nav_keys=["companies"])
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

    def test_admin_can_store_and_read_company_cockpit_fields(self):
        self._authenticate(self.admin_token)
        payload = {
            "name": "Cheonha Logistics",
            "tenant_code": "cheonha",
            "workflow_profile": "cheonha_ops_v1",
            "enabled_features": ["settlement", "vehicle"],
            "home_dashboard_preset": {
                "cards": ["settlement", "vehicle", "placeholder", "placeholder"],
            },
            "workspace_presets": {
                "settlement": {
                    "tabs": [
                        "dispatch-data",
                        "driver-management",
                        "operations-status",
                        "settlement-processing",
                        "team-management",
                    ]
                }
            },
        }

        create_response = self.client.post("/companies/", payload, format="json")

        self.assertEqual(create_response.status_code, 201)
        company_ref = create_response.data["route_no"]

        retrieve_response = self.client.get(f"/companies/{company_ref}/")

        self.assertEqual(retrieve_response.status_code, 200)
        self.assertEqual(retrieve_response.data["tenant_code"], "cheonha")
        self.assertEqual(retrieve_response.data["workflow_profile"], "cheonha_ops_v1")
        self.assertEqual(retrieve_response.data["enabled_features"], ["settlement", "vehicle"])
        self.assertEqual(
            retrieve_response.data["home_dashboard_preset"],
            {"cards": ["settlement", "vehicle", "placeholder", "placeholder"]},
        )
        self.assertEqual(
            retrieve_response.data["workspace_presets"]["settlement"]["tabs"],
            [
                "dispatch-data",
                "driver-management",
                "operations-status",
                "settlement-processing",
                "team-management",
            ],
        )

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

    def test_public_company_list_is_available_without_authentication(self):
        self._authenticate(self.admin_token)
        self.client.post("/companies/", {"name": "Alpha Company"}, format="json")
        self.client.post("/companies/", {"name": "Beta Company"}, format="json")
        self.client.credentials()

        response = self.client.get("/companies/public/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["name"] for item in response.data], ["Alpha Company", "Beta Company"])
        self.assertEqual(
            set(response.data[0].keys()),
            {"company_id", "route_no", "name"},
        )

    def test_public_company_resolve_returns_cockpit_payload_by_tenant_code(self):
        self._authenticate(self.admin_token)
        self.client.post(
            "/companies/",
            {
                "name": "Cheonha Logistics",
                "tenant_code": "cheonha",
                "workflow_profile": "cheonha_ops_v1",
                "enabled_features": ["settlement", "vehicle"],
                "home_dashboard_preset": {
                    "cards": ["settlement", "vehicle", "placeholder", "placeholder"],
                },
                "workspace_presets": {
                    "settlement": {
                        "tabs": [
                            "dispatch-data",
                            "driver-management",
                            "operations-status",
                            "settlement-processing",
                            "team-management",
                        ]
                    }
                },
            },
            format="json",
        )
        self.client.credentials()

        response = self.client.get("/companies/public/resolve/", {"tenant_code": "cheonha"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "company_id": response.data["company_id"],
                "company_name": "Cheonha Logistics",
                "tenant_code": "cheonha",
                "workflow_profile": "cheonha_ops_v1",
                "enabled_features": ["settlement", "vehicle"],
                "home_dashboard_preset": {
                    "cards": ["settlement", "vehicle", "placeholder", "placeholder"],
                },
                "workspace_presets": {
                    "settlement": {
                        "tabs": [
                            "dispatch-data",
                            "driver-management",
                            "operations-status",
                            "settlement-processing",
                            "team-management",
                        ]
                    }
                },
            },
        )

    def test_public_company_resolve_returns_404_for_unknown_tenant_code(self):
        response = self.client.get("/companies/public/resolve/", {"tenant_code": "missing"})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_missing_resource_returns_404_shape(self):
        self._authenticate(self.admin_token)

        response = self.client.get("/companies/999999/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_without_companies_nav_key_cannot_list_companies(self):
        self._authenticate(self._issue_token("admin", allowed_nav_keys=[]))

        response = self.client.get("/companies/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_without_companies_nav_key_cannot_list_fleets(self):
        self._authenticate(self._issue_token("admin", allowed_nav_keys=[]))

        response = self.client.get("/fleets/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
