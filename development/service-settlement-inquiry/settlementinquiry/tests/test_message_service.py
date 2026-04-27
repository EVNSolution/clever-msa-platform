from uuid import uuid4
from unittest.mock import Mock

from django.test import TestCase

from settlementinquiry.models import SettlementInquiryMessage, SettlementInquiryThread
from settlementinquiry.services.message_service import MessageService


class MessageServiceTests(TestCase):
    def setUp(self) -> None:
        self.driver_id = str(uuid4())
        self.driver_account_id = str(uuid4())

    def test_create_driver_message_creates_thread_lazily(self) -> None:
        source_clients = Mock()
        service = MessageService(source_clients=source_clients)

        result = service.create_driver_message(
            driver_id=self.driver_id,
            driver_account_id=self.driver_account_id,
            message="정산 금액을 확인해주세요.",
            attachment_payload=None,
            authorization="Bearer token",
        )

        self.assertEqual(SettlementInquiryThread.objects.count(), 1)
        self.assertEqual(SettlementInquiryMessage.objects.count(), 1)
        self.assertEqual(str(result.thread.driver_account_id), self.driver_account_id)
        self.assertEqual(result.message.author_scope, SettlementInquiryMessage.AuthorScope.DRIVER)
        source_clients.validate_snapshot_reference.assert_not_called()

    def test_create_driver_message_reuses_existing_open_thread(self) -> None:
        source_clients = Mock()
        service = MessageService(source_clients=source_clients)

        first_result = service.create_driver_message(
            driver_id=self.driver_id,
            driver_account_id=self.driver_account_id,
            message="첫 문의입니다.",
            attachment_payload=None,
            authorization="Bearer token",
        )
        second_result = service.create_driver_message(
            driver_id=self.driver_id,
            driver_account_id=self.driver_account_id,
            message="추가 문의입니다.",
            attachment_payload=None,
            authorization="Bearer token",
        )

        self.assertEqual(SettlementInquiryThread.objects.count(), 1)
        self.assertEqual(SettlementInquiryMessage.objects.count(), 2)
        self.assertEqual(first_result.thread.thread_id, second_result.thread.thread_id)
