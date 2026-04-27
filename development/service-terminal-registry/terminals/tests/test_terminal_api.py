from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient


class TerminalApiTests(TestCase):
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

    def _terminal_payload(self, **overrides):
        payload = {
            "manufacturer_company_id": str(uuid4()),
            "imei": f"356{uuid4().int % 10**12:012d}",
            "iccid": f"8982{uuid4().int % 10**14:014d}",
            "firmware_version": "1.0.0",
            "protocol_version": "1.0",
            "app_version": "1.0.0",
            "terminal_status": "active",
        }
        payload.update(overrides)
        return payload

    def _installation_payload(self, **overrides):
        payload = {
            "terminal_id": str(uuid4()),
            "vehicle_id": str(uuid4()),
            "installation_status": "installed",
            "installed_at": "2026-03-20T10:00:00Z",
            "removed_at": None,
        }
        payload.update(overrides)
        return payload

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_initial_migration_exists_for_startup_migrate(self):
        migration_file = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_file.exists())

    def test_terminals_unauthenticated_list_returns_401(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_installations_unauthenticated_list_returns_401(self):
        response = self.client.get("/installations/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_can_create_terminal(self):
        self._authenticate(self.admin_token)

        response = self.client.post("/", self._terminal_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("terminal_id", response.data)
        self.assertIn("created_at", response.data)
        self.assertIn("updated_at", response.data)

    def test_imei_must_be_unique(self):
        self._authenticate(self.admin_token)
        payload = self._terminal_payload()
        create_response = self.client.post("/", payload, format="json")
        self.assertEqual(create_response.status_code, 201)

        duplicate_response = self.client.post(
            "/",
            self._terminal_payload(imei=payload["imei"]),
            format="json",
        )

        self.assertEqual(duplicate_response.status_code, 400)
        self.assertIn("imei", duplicate_response.data["details"])

    def test_user_can_list_but_cannot_write(self):
        self._authenticate(self.user_token)

        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(
            self.client.post("/", self._terminal_payload(), format="json").status_code,
            403,
        )

    def test_admin_without_vehicle_nav_key_is_denied(self):
        self._authenticate_admin_with_nav_keys("dispatch")

        self.assertEqual(self.client.get("/").status_code, 403)
        self.assertEqual(self.client.get("/installations/").status_code, 403)

    def test_admin_with_vehicle_nav_key_can_read(self):
        self._authenticate_admin_with_nav_keys("vehicles")

        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/installations/").status_code, 200)

    def test_admin_can_create_installation_for_active_terminal_and_vehicle(self):
        self._authenticate(self.admin_token)
        create_terminal = self.client.post("/", self._terminal_payload(), format="json")
        self.assertEqual(create_terminal.status_code, 201)
        terminal_id = create_terminal.data["terminal_id"]

        with patch(
            "terminals.services.vehicle_registry_client.VehicleRegistryClient.get_vehicle",
            return_value={"vehicle_id": str(uuid4()), "vehicle_status": "active"},
        ):
            response = self.client.post(
                "/installations/",
                self._installation_payload(terminal_id=terminal_id),
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        self.assertIn("terminal_installation_id", response.data)

    def test_duplicate_active_installation_for_terminal_is_rejected(self):
        self._authenticate(self.admin_token)
        create_terminal = self.client.post("/", self._terminal_payload(), format="json")
        self.assertEqual(create_terminal.status_code, 201)
        terminal_id = create_terminal.data["terminal_id"]
        vehicle_a = str(uuid4())
        vehicle_b = str(uuid4())

        with patch(
            "terminals.services.vehicle_registry_client.VehicleRegistryClient.get_vehicle",
            return_value={"vehicle_id": vehicle_a, "vehicle_status": "active"},
        ):
            first = self.client.post(
                "/installations/",
                self._installation_payload(terminal_id=terminal_id, vehicle_id=vehicle_a),
                format="json",
            )
        self.assertEqual(first.status_code, 201)

        with patch(
            "terminals.services.vehicle_registry_client.VehicleRegistryClient.get_vehicle",
            return_value={"vehicle_id": vehicle_b, "vehicle_status": "active"},
        ):
            duplicate = self.client.post(
                "/installations/",
                self._installation_payload(terminal_id=terminal_id, vehicle_id=vehicle_b),
                format="json",
            )

        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("non_field_errors", duplicate.data["details"])

    def test_inactive_vehicle_installation_is_rejected(self):
        self._authenticate(self.admin_token)
        create_terminal = self.client.post("/", self._terminal_payload(), format="json")
        self.assertEqual(create_terminal.status_code, 201)
        terminal_id = create_terminal.data["terminal_id"]

        with patch(
            "terminals.services.vehicle_registry_client.VehicleRegistryClient.get_vehicle",
            return_value={"vehicle_id": str(uuid4()), "vehicle_status": "inactive"},
        ):
            response = self.client.post(
                "/installations/",
                self._installation_payload(terminal_id=terminal_id),
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("vehicle_id", response.data["details"])
