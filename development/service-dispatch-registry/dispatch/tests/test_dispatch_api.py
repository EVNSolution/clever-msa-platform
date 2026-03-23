from datetime import date, datetime, timedelta, timezone
from importlib import import_module
from pathlib import Path
from unittest.mock import patch
from uuid import UUID, uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient


def _load_models_module(test_case: TestCase):
    try:
        return import_module("dispatch.models")
    except ModuleNotFoundError as exc:
        test_case.fail(f"dispatch.models module missing: {exc}")


class DispatchApiTests(TestCase):
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

    def _plan_payload(self):
        return {
            "company_id": "30000000-0000-0000-0000-000000000001",
            "fleet_id": "40000000-0000-0000-0000-000000000001",
            "dispatch_date": "2026-03-24",
            "planned_volume": 120,
            "dispatch_status": "draft",
        }

    def _schedule_payload(self):
        return {
            "vehicle_id": "50000000-0000-0000-0000-000000000001",
            "fleet_id": "40000000-0000-0000-0000-000000000001",
            "dispatch_date": "2026-03-24",
            "shift_slot": "A",
            "schedule_status": "planned",
            "starts_at": "09:00:00",
            "ends_at": "18:00:00",
        }

    def _assignment_payload(self, vehicle_schedule_id: str):
        return {
            "vehicle_schedule_id": vehicle_schedule_id,
            "vehicle_id": "50000000-0000-0000-0000-000000000001",
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "operator_company_id": "30000000-0000-0000-0000-000000000001",
            "dispatch_date": "2026-03-24",
            "shift_slot": "A",
            "assignment_status": "assigned",
            "assigned_at": "2026-03-24T09:00:00Z",
            "unassigned_at": None,
        }

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_initial_migration_file_exists(self):
        migration_path = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_path.exists())

    def test_unauthenticated_plan_list_returns_401(self):
        response = self.client.get("/plans/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_can_create_dispatch_plan(self):
        self._authenticate(self.admin_token)

        response = self.client.post("/plans/", self._plan_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("dispatch_plan_id", response.data)

    def test_admin_can_create_vehicle_schedule(self):
        self._authenticate(self.admin_token)

        response = self.client.post(
            "/vehicle-schedules/",
            self._schedule_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("vehicle_schedule_id", response.data)

    def test_admin_can_create_dispatch_assignment(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        payload = self._assignment_payload(str(schedule.vehicle_schedule_id))

        with patch(
            "dispatch.services.source_clients.SourceClients.get_vehicle",
            return_value={
                "vehicle_id": payload["vehicle_id"],
                "vehicle_status": "active",
            },
        ), patch(
            "dispatch.services.source_clients.SourceClients.list_vehicle_operator_accesses",
            return_value=[
                {
                    "operator_company_id": payload["operator_company_id"],
                    "access_status": "active",
                }
            ],
        ), patch(
            "dispatch.services.source_clients.SourceClients.get_driver",
            return_value={
                "driver_id": payload["driver_id"],
                "company_id": payload["operator_company_id"],
            },
        ):
            response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("dispatch_assignment_id", response.data)
        self.assertEqual(response.data["operator_company_id"], payload["operator_company_id"])

    def test_authenticated_user_can_read_but_cannot_write(self):
        self._authenticate(self.user_token)

        self.assertEqual(self.client.get("/plans/").status_code, 200)
        self.assertEqual(
            self.client.post("/plans/", self._plan_payload(), format="json").status_code,
            403,
        )

