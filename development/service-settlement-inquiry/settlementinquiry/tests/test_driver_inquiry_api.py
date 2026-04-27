from datetime import datetime, timedelta, timezone
from uuid import uuid4
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from settlementinquiry.models import (
    SettlementInquiryAttachmentReference,
    SettlementInquiryMessage,
    SettlementInquiryThread,
)
from settlementinquiry.services.source_clients import SourceNotFoundError


class DriverInquiryApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.driver_account_id = str(uuid4())
        self.driver_id = str(uuid4())
        self.driver_token = self._issue_token(
            role="user",
            account_id=self.driver_account_id,
            driver_id=self.driver_id,
        )

    def _issue_token(self, *, role: str, account_id: str, driver_id: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": account_id,
            "driver_id": driver_id,
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

    def _authenticate(self) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.driver_token}")

    def test_get_me_thread_returns_null_before_first_message(self) -> None:
        self._authenticate()

        response = self.client.get("/api/settlement-inquiries/me/thread/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"thread": None})

    def test_get_me_messages_returns_empty_list_before_first_message(self) -> None:
        self._authenticate()

        response = self.client.get("/api/settlement-inquiries/me/messages/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"messages": []})

    @patch("settlementinquiry.services.message_service.SourceClients", create=True)
    def test_first_post_creates_thread_lazily(self, mock_source_clients) -> None:
        mock_source_clients.return_value.validate_snapshot_reference.return_value = None
        self._authenticate()

        response = self.client.post(
            "/api/settlement-inquiries/me/messages/",
            {"message": "특근인데 일반 정산으로 반영된 것 같습니다."},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(SettlementInquiryThread.objects.count(), 1)
        self.assertEqual(SettlementInquiryMessage.objects.count(), 1)
        self.assertEqual(response.data["author_scope"], "driver")
        self.assertEqual(response.data["message"], "특근인데 일반 정산으로 반영된 것 같습니다.")
        self.assertEqual(response.data["attachment_references"], [])

    @patch("settlementinquiry.services.message_service.SourceClients", create=True)
    def test_attachment_reference_stores_snapshot_id_only(self, mock_source_clients) -> None:
        snapshot_id = "20000000-0000-0000-0000-000000000001"
        mock_source_clients.return_value.validate_snapshot_reference.return_value = {
            "daily_delivery_input_snapshot_id": snapshot_id,
            "driver_id": self.driver_id,
            "service_date": "2026-04-20",
        }
        self._authenticate()

        response = self.client.post(
            "/api/settlement-inquiries/me/messages/",
            {
                "message": "박스 수가 누락된 것 같습니다.",
                "attachment": {"daily_delivery_input_snapshot_id": snapshot_id},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(SettlementInquiryAttachmentReference.objects.count(), 1)
        attachment = SettlementInquiryAttachmentReference.objects.get()
        self.assertEqual(str(attachment.daily_delivery_input_snapshot_id), snapshot_id)
        self.assertEqual(response.data["attachment_references"][0]["daily_delivery_input_snapshot_id"], snapshot_id)

    @patch("settlementinquiry.services.message_service.SourceClients", create=True)
    def test_invalid_snapshot_id_is_rejected(self, mock_source_clients) -> None:
        mock_source_clients.return_value.validate_snapshot_reference.side_effect = SourceNotFoundError(
            "Snapshot not found."
        )
        self._authenticate()

        response = self.client.post(
            "/api/settlement-inquiries/me/messages/",
            {
                "message": "첨부 확인 부탁드립니다.",
                "attachment": {"daily_delivery_input_snapshot_id": "20000000-0000-0000-0000-000000000099"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("attachment", response.data["details"])
