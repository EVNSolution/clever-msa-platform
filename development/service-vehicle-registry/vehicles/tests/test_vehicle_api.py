from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient


class VehicleApiTests(TestCase):
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

    def _issue_token_without_sub(self, role: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
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

    def _vehicle_master_payload(self, **overrides):
        payload = {
            "manufacturer_company_id": str(uuid4()),
            "plate_number": "12가3456",
            "vin": f"VIN-{uuid4().hex[:16].upper()}",
            "manufacturer_vehicle_code": f"MODEL-{uuid4().hex[:8].upper()}",
            "model_name": "Cargo Van",
            "vehicle_status": "active",
        }
        payload.update(overrides)
        return payload

    def _create_vehicle_master(self, **overrides):
        response = self.client.post(
            "/vehicle-masters/",
            self._vehicle_master_payload(**overrides),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response

    def _vehicle_operator_access_payload(self, **overrides):
        vehicle = overrides.pop("vehicle", None)
        if vehicle is None and "vehicle_id" not in overrides:
            vehicle = self._create_vehicle_master()

        payload = {
            "vehicle_id": vehicle.data["vehicle_id"] if vehicle is not None else None,
            "operator_company_id": str(uuid4()),
            "access_status": "active",
            "started_at": "2026-01-01T00:00:00Z",
            "ended_at": None,
        }
        payload.update(overrides)
        return payload

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_vehicle_initial_migration_exists_for_startup_migrate(self):
        migration_file = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_file.exists())

    def test_vehicle_masters_unauthenticated_list_returns_401(self):
        response = self.client.get("/vehicle-masters/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_vehicle_operator_accesses_unauthenticated_list_returns_401(self):
        response = self.client.get("/vehicle-operator-accesses/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_token_missing_sub_returns_401_instead_of_500(self):
        self._authenticate(self._issue_token_without_sub("user"))

        response = self.client.get("/vehicle-masters/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_malformed_authorization_header_returns_401_instead_of_500(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer ÿ")

        response = self.client.get("/vehicle-masters/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_can_create_vehicle_master(self):
        self._authenticate(self.admin_token)

        response = self.client.post(
            "/vehicle-masters/",
            self._vehicle_master_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("vehicle_id", response.data)
        self.assertIn("created_at", response.data)
        self.assertIn("updated_at", response.data)

    def test_admin_can_create_vehicle_master_without_manufacturer_vehicle_code(self):
        self._authenticate(self.admin_token)

        payload = self._vehicle_master_payload()
        payload.pop("manufacturer_vehicle_code")

        response = self.client.post("/vehicle-masters/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["manufacturer_vehicle_code"])
        self.assertIn("created_at", response.data)
        self.assertIn("updated_at", response.data)

    def test_admin_can_update_vehicle_master(self):
        self._authenticate(self.admin_token)

        create_response = self._create_vehicle_master()
        vehicle_id = create_response.data["vehicle_id"]

        update_response = self.client.patch(
            f"/vehicle-masters/{vehicle_id}/",
            {"vehicle_status": "inactive"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["vehicle_status"], "inactive")
        self.assertIn("created_at", update_response.data)
        self.assertIn("updated_at", update_response.data)

    def test_vehicle_master_detail_disallows_put_and_does_not_expose_it(self):
        self._authenticate(self.admin_token)
        create_response = self._create_vehicle_master()
        vehicle_id = create_response.data["vehicle_id"]

        put_response = self.client.put(
            f"/vehicle-masters/{vehicle_id}/",
            self._vehicle_master_payload(),
            format="json",
        )

        self.assertEqual(put_response.status_code, 405)
        self.assertEqual(set(put_response.data.keys()), {"code", "message", "details"})
        self.assertIn("GET", put_response.headers["Allow"])
        self.assertIn("PATCH", put_response.headers["Allow"])
        self.assertIn("OPTIONS", put_response.headers["Allow"])
        self.assertNotIn("PUT", put_response.headers["Allow"])

    def test_admin_can_create_and_update_vehicle_operator_access(self):
        self._authenticate(self.admin_token)

        create_response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(),
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertIn("created_at", create_response.data)
        self.assertIn("updated_at", create_response.data)
        access_id = create_response.data["vehicle_operator_access_id"]

        update_response = self.client.patch(
            f"/vehicle-operator-accesses/{access_id}/",
            {"access_status": "suspended", "ended_at": "2026-02-01T00:00:00Z"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["access_status"], "suspended")
        self.assertEqual(update_response.data["ended_at"], "2026-02-01T00:00:00Z")
        self.assertIn("created_at", update_response.data)
        self.assertIn("updated_at", update_response.data)

    def test_vehicle_operator_access_status_only_accepts_supported_values(self):
        self._authenticate(self.admin_token)

        response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(access_status="inactive"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("access_status", response.data["details"])

    def test_vehicle_operator_access_detail_disallows_put_and_does_not_expose_it(self):
        self._authenticate(self.admin_token)
        vehicle = self._create_vehicle_master()
        create_response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(vehicle=vehicle),
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        access_id = create_response.data["vehicle_operator_access_id"]

        put_response = self.client.put(
            f"/vehicle-operator-accesses/{access_id}/",
            self._vehicle_operator_access_payload(vehicle=vehicle),
            format="json",
        )

        self.assertEqual(put_response.status_code, 405)
        self.assertEqual(set(put_response.data.keys()), {"code", "message", "details"})
        self.assertIn("GET", put_response.headers["Allow"])
        self.assertIn("PATCH", put_response.headers["Allow"])
        self.assertIn("OPTIONS", put_response.headers["Allow"])
        self.assertNotIn("PUT", put_response.headers["Allow"])

    def test_manufacturer_company_id_is_required(self):
        self._authenticate(self.admin_token)

        payload = self._vehicle_master_payload()
        payload.pop("manufacturer_company_id")

        response = self.client.post("/vehicle-masters/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("manufacturer_company_id", response.data["details"])

    def test_plate_number_must_be_unique(self):
        self._authenticate(self.admin_token)

        response = self._create_vehicle_master()

        duplicate_response = self.client.post(
            "/vehicle-masters/",
            self._vehicle_master_payload(plate_number=response.data["plate_number"]),
            format="json",
        )

        self.assertEqual(duplicate_response.status_code, 400)
        self.assertEqual(set(duplicate_response.data.keys()), {"code", "message", "details"})
        self.assertIn("plate_number", duplicate_response.data["details"])

    def test_vin_must_be_unique(self):
        self._authenticate(self.admin_token)

        response = self._create_vehicle_master()

        duplicate_response = self.client.post(
            "/vehicle-masters/",
            self._vehicle_master_payload(vin=response.data["vin"]),
            format="json",
        )

        self.assertEqual(duplicate_response.status_code, 400)
        self.assertEqual(set(duplicate_response.data.keys()), {"code", "message", "details"})
        self.assertIn("vin", duplicate_response.data["details"])

    def test_vehicle_status_only_accepts_supported_values(self):
        self._authenticate(self.admin_token)

        response = self.client.post(
            "/vehicle-masters/",
            self._vehicle_master_payload(vehicle_status="maintenance"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("vehicle_status", response.data["details"])

    def test_vehicle_operator_access_requires_existing_vehicle_master(self):
        self._authenticate(self.admin_token)

        response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(
                vehicle_id=str(uuid4()),
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("vehicle_id", response.data["details"])

    def test_vehicle_operator_access_allows_at_most_one_active_record_per_vehicle(self):
        self._authenticate(self.admin_token)

        vehicle = self._create_vehicle_master()
        first_response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(vehicle=vehicle),
            format="json",
        )
        self.assertEqual(first_response.status_code, 201)

        duplicate_response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(
                vehicle=vehicle,
                operator_company_id=str(uuid4()),
            ),
            format="json",
        )

        self.assertEqual(duplicate_response.status_code, 400)
        self.assertEqual(set(duplicate_response.data.keys()), {"code", "message", "details"})
        self.assertIn("non_field_errors", duplicate_response.data["details"])

    def test_vehicle_operator_access_list_filters_by_vehicle_id(self):
        self._authenticate(self.admin_token)

        vehicle_a = self._create_vehicle_master()
        vehicle_b = self._create_vehicle_master(
            plate_number="34나5678",
            vin=f"VIN-{uuid4().hex[:16].upper()}",
        )
        first_access = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(vehicle=vehicle_a),
            format="json",
        )
        self.assertEqual(first_access.status_code, 201)
        second_access = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(vehicle=vehicle_b),
            format="json",
        )
        self.assertEqual(second_access.status_code, 201)

        response = self.client.get(
            f"/vehicle-operator-accesses/?vehicle_id={vehicle_a.data['vehicle_id']}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["vehicle_id"], vehicle_a.data["vehicle_id"])

    def test_vehicle_operator_access_list_filters_by_operator_company_id(self):
        self._authenticate(self.admin_token)

        operator_company_id = str(uuid4())
        vehicle_a = self._create_vehicle_master()
        vehicle_b = self._create_vehicle_master(
            plate_number="56다7890",
            vin=f"VIN-{uuid4().hex[:16].upper()}",
        )
        first_access = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(
                vehicle=vehicle_a,
                operator_company_id=operator_company_id,
            ),
            format="json",
        )
        self.assertEqual(first_access.status_code, 201)
        second_access = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(
                vehicle=vehicle_b,
                operator_company_id=str(uuid4()),
            ),
            format="json",
        )
        self.assertEqual(second_access.status_code, 201)

        response = self.client.get(
            f"/vehicle-operator-accesses/?operator_company_id={operator_company_id}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["operator_company_id"], operator_company_id)

    def test_vehicle_operator_access_list_filters_by_access_status(self):
        self._authenticate(self.admin_token)

        vehicle_a = self._create_vehicle_master()
        vehicle_b = self._create_vehicle_master(
            plate_number="78라9012",
            vin=f"VIN-{uuid4().hex[:16].upper()}",
        )
        active_access = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(vehicle=vehicle_a, access_status="active"),
            format="json",
        )
        self.assertEqual(active_access.status_code, 201)
        suspended_access = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(
                vehicle=vehicle_b,
                access_status="suspended",
                ended_at="2026-02-01T00:00:00Z",
            ),
            format="json",
        )
        self.assertEqual(suspended_access.status_code, 201)

        response = self.client.get("/vehicle-operator-accesses/?access_status=suspended")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["access_status"], "suspended")

    def test_vehicle_operator_access_list_rejects_malformed_vehicle_id_filter(self):
        self._authenticate(self.admin_token)

        response = self.client.get("/vehicle-operator-accesses/?vehicle_id=not-a-uuid")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("vehicle_id", response.data["details"])

    def test_vehicle_operator_access_list_rejects_malformed_operator_company_id_filter(self):
        self._authenticate(self.admin_token)

        response = self.client.get(
            "/vehicle-operator-accesses/?operator_company_id=not-a-uuid"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})
        self.assertIn("operator_company_id", response.data["details"])

    def test_missing_vehicle_returns_404_error_envelope(self):
        self._authenticate(self.admin_token)

        response = self.client.get(f"/vehicle-masters/{uuid4()}/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_user_write_denial_returns_403_error_envelope_for_vehicle_master(self):
        self._authenticate(self.user_token)

        response = self.client.post(
            "/vehicle-masters/",
            self._vehicle_master_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_user_can_list_and_read_vehicle_master_but_cannot_write(self):
        self._authenticate(self.admin_token)
        create_response = self._create_vehicle_master()
        vehicle_id = create_response.data["vehicle_id"]

        self._authenticate(self.user_token)
        self.assertEqual(self.client.get("/vehicle-masters/").status_code, 200)
        self.assertEqual(self.client.get(f"/vehicle-masters/{vehicle_id}/").status_code, 200)
        self.assertEqual(
            self.client.post(
                "/vehicle-masters/",
                self._vehicle_master_payload(),
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.patch(
                f"/vehicle-masters/{vehicle_id}/",
                {"vehicle_status": "inactive"},
                format="json",
            ).status_code,
            403,
        )

    def test_user_cannot_write_vehicle_operator_access(self):
        self._authenticate(self.admin_token)
        vehicle = self._create_vehicle_master()

        self._authenticate(self.user_token)
        create_response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(vehicle=vehicle),
            format="json",
        )
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(set(create_response.data.keys()), {"code", "message", "details"})

    def test_user_can_list_and_read_vehicle_operator_access_but_cannot_write(self):
        self._authenticate(self.admin_token)
        vehicle = self._create_vehicle_master()
        create_response = self.client.post(
            "/vehicle-operator-accesses/",
            self._vehicle_operator_access_payload(vehicle=vehicle),
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        access_id = create_response.data["vehicle_operator_access_id"]

        self._authenticate(self.user_token)
        self.assertEqual(self.client.get("/vehicle-operator-accesses/").status_code, 200)
        self.assertEqual(
            self.client.get(f"/vehicle-operator-accesses/{access_id}/").status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(
                f"/vehicle-operator-accesses/{access_id}/",
                {"access_status": "suspended"},
                format="json",
            ).status_code,
            403,
        )
