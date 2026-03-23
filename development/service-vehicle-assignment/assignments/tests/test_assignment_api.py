from datetime import datetime, timedelta, timezone
from importlib import import_module
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from assignments.models import DriverVehicleAssignment


class DriverVehicleAssignmentApiTests(TestCase):
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

    def _payload(self):
        return {
            "driver_id": str(uuid4()),
            "vehicle_id": str(uuid4()),
            "operator_company_id": str(uuid4()),
            "assignment_status": "assigned",
            "assigned_at": "2026-03-20T00:00:00Z",
            "unassigned_at": None,
        }

    def _vehicle_response(self, payload):
        return {
            "vehicle_id": payload["vehicle_id"],
            "vehicle_status": "active",
        }

    def _operator_accesses_response(self, payload):
        return [
            {
                "vehicle_operator_access_id": str(uuid4()),
                "vehicle_id": payload["vehicle_id"],
                "operator_company_id": payload["operator_company_id"],
                "access_status": "active",
            }
        ]

    def _driver_response(self, payload):
        return {
            "driver_id": payload["driver_id"],
            "company_id": payload["operator_company_id"],
        }

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_initial_migration_file_exists(self):
        migration_path = (
            Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"
        )

        self.assertTrue(migration_path.exists())

    def test_unauthenticated_list_returns_401(self):
        response = self.client.get("/assignments/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_can_create_assignment(self):
        self._authenticate(self.admin_token)
        payload = self._payload()

        with patch(
            "assignments.services.source_clients.SourceClients.get_vehicle",
            return_value=self._vehicle_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.list_vehicle_operator_accesses",
            return_value=self._operator_accesses_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.get_driver",
            return_value=self._driver_response(payload),
        ):
            response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("driver_vehicle_assignment_id", response.data)
        self.assertEqual(response.data["operator_company_id"], payload["operator_company_id"])

    def test_driver_id_is_required(self):
        self._authenticate(self.admin_token)
        payload = self._payload()
        payload.pop("driver_id")

        response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("driver_id", response.data["details"])

    def test_vehicle_id_is_required(self):
        self._authenticate(self.admin_token)
        payload = self._payload()
        payload.pop("vehicle_id")

        response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("vehicle_id", response.data["details"])

    def test_operator_company_id_is_required(self):
        self._authenticate(self.admin_token)
        payload = self._payload()
        payload.pop("operator_company_id")

        response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("operator_company_id", response.data["details"])

    def test_assignment_status_only_accepts_supported_values(self):
        self._authenticate(self.admin_token)
        payload = self._payload()
        payload["assignment_status"] = "pending"

        response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("assignment_status", response.data["details"])

    def test_admin_can_patch_assignment_and_persist_update(self):
        self._authenticate(self.admin_token)
        payload = self._payload()
        with patch(
            "assignments.services.source_clients.SourceClients.get_vehicle",
            return_value=self._vehicle_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.list_vehicle_operator_accesses",
            return_value=self._operator_accesses_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.get_driver",
            return_value=self._driver_response(payload),
        ):
            create_response = self.client.post("/assignments/", payload, format="json")
        self.assertEqual(create_response.status_code, 201)
        assignment_id = create_response.data["driver_vehicle_assignment_id"]

        patch_response = self.client.patch(
            f"/assignments/{assignment_id}/",
            {
                "assignment_status": "unassigned",
                "unassigned_at": "2026-03-21T00:00:00Z",
            },
            format="json",
        )

        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["assignment_status"], "unassigned")
        self.assertEqual(patch_response.data["unassigned_at"], "2026-03-21T00:00:00Z")

        detail_response = self.client.get(f"/assignments/{assignment_id}/")

        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["assignment_status"], "unassigned")
        self.assertEqual(detail_response.data["unassigned_at"], "2026-03-21T00:00:00Z")

    def test_patch_to_unassigned_sets_unassigned_at_when_omitted(self):
        self._authenticate(self.admin_token)
        assignment = DriverVehicleAssignment.objects.create(
            driver_id=uuid4(),
            vehicle_id=uuid4(),
            operator_company_id=uuid4(),
            assignment_status="assigned",
            assigned_at=datetime(2026, 3, 20, tzinfo=timezone.utc),
            unassigned_at=None,
        )

        patch_response = self.client.patch(
            f"/assignments/{assignment.driver_vehicle_assignment_id}/",
            {"assignment_status": "unassigned"},
            format="json",
        )

        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["assignment_status"], "unassigned")
        self.assertIsNotNone(patch_response.data["unassigned_at"])

        assignment.refresh_from_db()
        self.assertEqual(assignment.assignment_status, "unassigned")
        self.assertIsNotNone(assignment.unassigned_at)

    def test_create_assigned_rejects_driver_company_mismatch(self):
        self._authenticate(self.admin_token)
        payload = self._payload()

        with patch(
            "assignments.services.source_clients.SourceClients.get_vehicle",
            return_value=self._vehicle_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.list_vehicle_operator_accesses",
            return_value=self._operator_accesses_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.get_driver",
            return_value={
                "driver_id": payload["driver_id"],
                "company_id": str(uuid4()),
            },
        ):
            response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("driver_id", response.data["details"])

    def test_create_assigned_returns_503_when_vehicle_validation_is_unavailable(self):
        self._authenticate(self.admin_token)
        payload = self._payload()

        with patch(
            "assignments.services.source_clients.SourceClients.get_vehicle",
            side_effect=import_module(
                "assignments.services.source_clients"
            ).SourceServiceError("boom"),
        ):
            response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "service_unavailable")
        self.assertEqual(response.data["message"], "Vehicle validation is unavailable.")

    def test_authenticated_user_can_list_and_read_but_cannot_write(self):
        self._authenticate(self.admin_token)
        payload = self._payload()
        with patch(
            "assignments.services.source_clients.SourceClients.get_vehicle",
            return_value=self._vehicle_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.list_vehicle_operator_accesses",
            return_value=self._operator_accesses_response(payload),
        ), patch(
            "assignments.services.source_clients.SourceClients.get_driver",
            return_value=self._driver_response(payload),
        ):
            create_response = self.client.post("/assignments/", payload, format="json")
        self.assertEqual(create_response.status_code, 201)
        assignment_id = create_response.data["driver_vehicle_assignment_id"]

        self._authenticate(self.user_token)
        self.assertEqual(self.client.get("/assignments/").status_code, 200)
        self.assertEqual(self.client.get(f"/assignments/{assignment_id}/").status_code, 200)
        self.assertEqual(
            self.client.post("/assignments/", self._payload(), format="json").status_code,
            403,
        )
        self.assertEqual(
            self.client.patch(
                f"/assignments/{assignment_id}/",
                {"assignment_status": "unassigned"},
                format="json",
            ).status_code,
            403,
        )
