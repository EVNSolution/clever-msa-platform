from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from personneldocuments.models import PersonnelDocument
from personneldocuments.services.source_clients import (
    SourceAuthenticationError,
    SourcePermissionError,
    SourceValidationError,
)


class PersonnelDocumentApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token(role="admin")
        self.user_token = self._issue_token(role="user")
        self.driver_id = str(UUID("10000000-0000-0000-0000-000000000001"))

    def _issue_token(self, *, role: str) -> str:
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

    def _admin_client(self) -> APIClient:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        return client

    def _user_client(self) -> APIClient:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        return client

    def _document_payload(self, *, driver_id: str | None = None, title: str = "2026 운송 계약서") -> dict:
        return {
            "driver_id": driver_id or self.driver_id,
            "document_type": PersonnelDocument.DocumentType.CONTRACT,
            "status": PersonnelDocument.DocumentStatus.ACTIVE,
            "title": title,
            "document_number": "CONTRACT-2026-001",
            "issuer_name": "CLEVER",
            "issued_on": "2026-03-24",
            "expires_on": "2027-03-23",
            "notes": "Initial contract.",
            "external_reference": "hr://contracts/2026-001",
            "payload": {"signed": True},
        }

    def _create_document(self) -> PersonnelDocument:
        return PersonnelDocument.objects.create(
            driver_id=UUID(self.driver_id),
            document_type=PersonnelDocument.DocumentType.CONTRACT,
            status=PersonnelDocument.DocumentStatus.ACTIVE,
            title="Existing Contract",
            document_number="CONTRACT-2026-000",
            issuer_name="CLEVER",
            issued_on="2026-03-24",
            expires_on="2027-03-23",
            payload={"signed": True},
        )

    def test_health_returns_ok(self) -> None:
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_non_admin_access_is_rejected_for_documents_crud(self) -> None:
        client = self._user_client()
        document_id = str(uuid4())

        responses = (
            client.get("/documents/"),
            client.post("/documents/", self._document_payload(), format="json"),
            client.patch(f"/documents/{document_id}/", {"title": "Changed"}, format="json"),
        )

        self.assertTrue(all(response.status_code == 403 for response in responses))

    @patch("personneldocuments.services.source_clients.SourceClients.validate_driver_exists", return_value=None)
    def test_admin_can_list_create_retrieve_and_patch_documents(self, _mock_validate_driver) -> None:
        existing = self._create_document()
        client = self._admin_client()

        list_response = client.get("/documents/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

        create_response = client.post("/documents/", self._document_payload(), format="json")
        self.assertEqual(create_response.status_code, 201)
        document_id = create_response.data["personnel_document_id"]

        detail_response = client.get(f"/documents/{document_id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["title"], "2026 운송 계약서")

        patch_response = client.patch(
            f"/documents/{existing.personnel_document_id}/",
            {"title": "Updated Contract"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["title"], "Updated Contract")

    def test_admin_can_filter_documents_by_driver_id(self) -> None:
        PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000001"),
            document_type=PersonnelDocument.DocumentType.CONTRACT,
            status=PersonnelDocument.DocumentStatus.ACTIVE,
            title="Driver One Contract",
        )
        PersonnelDocument.objects.create(
            driver_id=UUID("10000000-0000-0000-0000-000000000002"),
            document_type=PersonnelDocument.DocumentType.CONTRACT,
            status=PersonnelDocument.DocumentStatus.ACTIVE,
            title="Driver Two Contract",
        )

        response = self._admin_client().get("/documents/", {"driver_id": self.driver_id})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["driver_id"], self.driver_id)

    @patch("personneldocuments.services.source_clients.SourceClients.validate_driver_exists", return_value=None)
    def test_put_and_delete_are_not_allowed_for_document_detail(self, _mock_validate_driver) -> None:
        document = self._create_document()
        client = self._admin_client()

        put_response = client.put(
            f"/documents/{document.personnel_document_id}/",
            self._document_payload(),
            format="json",
        )
        delete_response = client.delete(f"/documents/{document.personnel_document_id}/")

        self.assertEqual(put_response.status_code, 405)
        self.assertEqual(delete_response.status_code, 405)

    @patch(
        "personneldocuments.services.source_clients.SourceClients.validate_driver_exists",
        side_effect=SourceValidationError(field="driver_id", message="Referenced driver does not exist."),
    )
    def test_create_rejects_unknown_driver(self, _mock_validate_driver) -> None:
        response = self._admin_client().post(
            "/documents/",
            self._document_payload(driver_id=str(uuid4())),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertEqual(response.data["details"]["driver_id"][0], "Referenced driver does not exist.")

    @patch("personneldocuments.services.source_clients.SourceClients.validate_driver_exists", return_value=None)
    def test_patch_rejects_unknown_driver(self, _mock_validate_driver) -> None:
        document = self._create_document()

        with patch(
            "personneldocuments.services.source_clients.SourceClients.validate_driver_exists",
            side_effect=SourceValidationError(field="driver_id", message="Referenced driver does not exist."),
        ):
            response = self._admin_client().patch(
                f"/documents/{document.personnel_document_id}/",
                {"driver_id": str(uuid4())},
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertEqual(response.data["details"]["driver_id"][0], "Referenced driver does not exist.")

    @patch(
        "personneldocuments.services.source_clients.SourceClients.validate_driver_exists",
        side_effect=SourceAuthenticationError("Upstream authentication failed."),
    )
    def test_create_surfaces_upstream_authentication_failure_as_401(self, _mock_validate_driver) -> None:
        response = self._admin_client().post("/documents/", self._document_payload(), format="json")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "authentication_failed")

    @patch(
        "personneldocuments.services.source_clients.SourceClients.validate_driver_exists",
        side_effect=SourcePermissionError("Upstream permission denied."),
    )
    def test_create_surfaces_upstream_permission_failure_as_403(self, _mock_validate_driver) -> None:
        response = self._admin_client().post("/documents/", self._document_payload(), format="json")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "permission_denied")
