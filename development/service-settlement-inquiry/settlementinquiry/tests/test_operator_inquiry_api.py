from datetime import timedelta
from uuid import uuid4
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from settlementinquiry.models import (
    SettlementInquiryAttachmentReference,
    SettlementInquiryMessage,
    SettlementInquiryThread,
)
from settlementinquiry.services.preview_client import PreviewUnavailableError


class OperatorInquiryApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.driver_account_id = str(uuid4())
        self.driver_id = str(uuid4())
        self.admin_account_id = str(uuid4())
        self.driver_token = self._issue_token(
            role="user",
            account_id=self.driver_account_id,
            driver_id=self.driver_id,
        )
        self.admin_token = self._issue_token(
            role="admin",
            account_id=self.admin_account_id,
            driver_id=str(uuid4()),
        )

    def _issue_token(self, *, role: str, account_id: str, driver_id: str) -> str:
        now = timezone.now()
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

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _create_thread_with_driver_message(self, *, attachment_snapshot_id: str | None = None) -> SettlementInquiryThread:
        thread = SettlementInquiryThread.objects.create(
            driver_id=self.driver_id,
            driver_account_id=self.driver_account_id,
            status=SettlementInquiryThread.Status.OPEN,
            latest_message_at=timezone.now(),
        )
        message = SettlementInquiryMessage.objects.create(
            thread=thread,
            author_scope=SettlementInquiryMessage.AuthorScope.DRIVER,
            author_account_id=self.driver_account_id,
            message="초기 문의입니다.",
        )
        if attachment_snapshot_id is not None:
            SettlementInquiryAttachmentReference.objects.create(
                message=message,
                daily_delivery_input_snapshot_id=attachment_snapshot_id,
                service_date=timezone.now().date(),
            )
        return thread

    def test_operator_can_list_threads(self) -> None:
        thread = self._create_thread_with_driver_message()
        self._authenticate(self.admin_token)

        response = self.client.get("/api/settlement-inquiries/threads/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["threads"]), 1)
        self.assertEqual(response.data["threads"][0]["thread_id"], str(thread.thread_id))

    @patch("settlementinquiry.views.send_operator_reply_inbox_notification", create=True)
    def test_operator_can_reply_to_thread_and_status_becomes_answered(self, mock_handoff) -> None:
        thread = self._create_thread_with_driver_message()
        self._authenticate(self.admin_token)

        response = self.client.post(
            f"/api/settlement-inquiries/threads/{thread.thread_id}/messages/",
            {"message": "확인 후 다시 안내드리겠습니다."},
            format="json",
        )

        thread.refresh_from_db()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(thread.status, SettlementInquiryThread.Status.ANSWERED)
        self.assertEqual(response.data["author_scope"], "operator")
        self.assertEqual(SettlementInquiryMessage.objects.count(), 2)
        mock_handoff.assert_called_once()

    def test_operator_can_patch_status(self) -> None:
        thread = self._create_thread_with_driver_message()
        self._authenticate(self.admin_token)

        response = self.client.patch(
            f"/api/settlement-inquiries/threads/{thread.thread_id}/",
            {"status": "closed"},
            format="json",
        )

        thread.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(thread.status, SettlementInquiryThread.Status.CLOSED)
        self.assertEqual(response.data["status"], "closed")

    @patch("settlementinquiry.views.send_operator_reply_inbox_notification", create=True)
    def test_driver_message_after_answered_reopens_thread(self, mock_handoff) -> None:
        thread = self._create_thread_with_driver_message()
        self._authenticate(self.admin_token)
        self.client.post(
            f"/api/settlement-inquiries/threads/{thread.thread_id}/messages/",
            {"message": "답변드립니다."},
            format="json",
        )

        self._authenticate(self.driver_token)
        response = self.client.post(
            "/api/settlement-inquiries/me/messages/",
            {"message": "추가로 확인 부탁드립니다."},
            format="json",
        )

        thread.refresh_from_db()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(thread.status, SettlementInquiryThread.Status.OPEN)

    def test_driver_message_after_closed_reopens_thread(self) -> None:
        thread = self._create_thread_with_driver_message()
        thread.status = SettlementInquiryThread.Status.CLOSED
        thread.save(update_fields=["status", "updated_at"])
        self._authenticate(self.driver_token)

        response = self.client.post(
            "/api/settlement-inquiries/me/messages/",
            {"message": "다시 문의드립니다."},
            format="json",
        )

        thread.refresh_from_db()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(thread.status, SettlementInquiryThread.Status.OPEN)

    @patch("settlementinquiry.views.PreviewClient", create=True)
    def test_operator_message_list_enriches_attachment_preview(self, mock_preview_client) -> None:
        thread = self._create_thread_with_driver_message(
            attachment_snapshot_id="20000000-0000-0000-0000-000000000001"
        )
        mock_preview_client.return_value.get_snapshot_preview.return_value = {
            "summary": "2026-04-20 snapshot preview",
        }
        self._authenticate(self.admin_token)

        response = self.client.get(f"/api/settlement-inquiries/threads/{thread.thread_id}/messages/")

        self.assertEqual(response.status_code, 200)
        attachment = response.data["messages"][0]["attachment_references"][0]
        self.assertEqual(attachment["preview_status"], "available")
        self.assertEqual(attachment["preview"]["summary"], "2026-04-20 snapshot preview")

    @patch("settlementinquiry.views.PreviewClient", create=True)
    def test_operator_message_list_returns_unavailable_when_preview_fails(self, mock_preview_client) -> None:
        thread = self._create_thread_with_driver_message(
            attachment_snapshot_id="20000000-0000-0000-0000-000000000001"
        )
        mock_preview_client.return_value.get_snapshot_preview.side_effect = PreviewUnavailableError("preview down")
        self._authenticate(self.admin_token)

        response = self.client.get(f"/api/settlement-inquiries/threads/{thread.thread_id}/messages/")

        self.assertEqual(response.status_code, 200)
        attachment = response.data["messages"][0]["attachment_references"][0]
        self.assertEqual(attachment["preview_status"], "unavailable")
        self.assertNotIn("preview", attachment)

    @patch(
        "settlementinquiry.views.send_operator_reply_inbox_notification",
        side_effect=RuntimeError("notification hub down"),
        create=True,
    )
    def test_operator_reply_still_succeeds_when_notification_handoff_fails(self, mock_handoff) -> None:
        thread = self._create_thread_with_driver_message()
        self._authenticate(self.admin_token)

        response = self.client.post(
            f"/api/settlement-inquiries/threads/{thread.thread_id}/messages/",
            {"message": "알림 없이도 답변은 저장되어야 합니다."},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(SettlementInquiryMessage.objects.count(), 2)
        mock_handoff.assert_called_once()
