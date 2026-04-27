from dataclasses import dataclass
from datetime import datetime

from django.db import transaction
from django.utils import timezone

from settlementinquiry.models import (
    SettlementInquiryAttachmentReference,
    SettlementInquiryMessage,
    SettlementInquiryThread,
)
from settlementinquiry.services.source_clients import SourceClients


@dataclass
class CreateDriverMessageResult:
    thread: SettlementInquiryThread
    message: SettlementInquiryMessage


class MessageService:
    def __init__(self, *, source_clients: SourceClients | None = None) -> None:
        self.source_clients = source_clients or SourceClients()

    @transaction.atomic
    def create_driver_message(
        self,
        *,
        driver_id: str,
        driver_account_id: str,
        message: str,
        attachment_payload: dict | None,
        authorization: str,
    ) -> CreateDriverMessageResult:
        now = timezone.now()
        thread, created = SettlementInquiryThread.objects.get_or_create(
            driver_id=driver_id,
            defaults={
                "driver_account_id": driver_account_id,
                "status": SettlementInquiryThread.Status.OPEN,
                "latest_message_at": now,
            },
        )
        if not created:
            thread.driver_account_id = driver_account_id
            thread.latest_message_at = now
            if thread.status in {
                SettlementInquiryThread.Status.ANSWERED,
                SettlementInquiryThread.Status.CLOSED,
            }:
                thread.status = SettlementInquiryThread.Status.OPEN
            thread.save(update_fields=["driver_account_id", "latest_message_at", "status", "updated_at"])

        inquiry_message = SettlementInquiryMessage.objects.create(
            thread=thread,
            author_scope=SettlementInquiryMessage.AuthorScope.DRIVER,
            author_account_id=driver_account_id,
            message=message,
        )

        if attachment_payload is not None:
            snapshot_id = attachment_payload["daily_delivery_input_snapshot_id"]
            snapshot = self.source_clients.validate_snapshot_reference(
                snapshot_id=snapshot_id,
                driver_id=driver_id,
                authorization=authorization,
            )
            service_date = snapshot.get("service_date")
            SettlementInquiryAttachmentReference.objects.create(
                message=inquiry_message,
                daily_delivery_input_snapshot_id=snapshot_id,
                service_date=datetime.fromisoformat(service_date).date() if service_date else None,
            )

        return CreateDriverMessageResult(thread=thread, message=inquiry_message)

    @transaction.atomic
    def create_operator_message(
        self,
        *,
        thread: SettlementInquiryThread,
        operator_account_id: str,
        message: str,
    ) -> CreateDriverMessageResult:
        now = timezone.now()
        thread.status = SettlementInquiryThread.Status.ANSWERED
        thread.latest_message_at = now
        thread.save(update_fields=["status", "latest_message_at", "updated_at"])

        inquiry_message = SettlementInquiryMessage.objects.create(
            thread=thread,
            author_scope=SettlementInquiryMessage.AuthorScope.OPERATOR,
            author_account_id=operator_account_id,
            message=message,
        )

        return CreateDriverMessageResult(thread=thread, message=inquiry_message)
