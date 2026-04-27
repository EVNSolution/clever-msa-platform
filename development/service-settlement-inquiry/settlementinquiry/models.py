from uuid import uuid4

from django.db import models


class SettlementInquiryThread(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ANSWERED = "answered", "Answered"
        CLOSED = "closed", "Closed"

    thread_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    driver_id = models.UUIDField(unique=True)
    driver_account_id = models.UUIDField(db_index=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    latest_message_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-latest_message_at",)


class SettlementInquiryMessage(models.Model):
    class AuthorScope(models.TextChoices):
        DRIVER = "driver", "Driver"
        OPERATOR = "operator", "Operator"

    message_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    thread = models.ForeignKey(
        SettlementInquiryThread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    author_scope = models.CharField(max_length=16, choices=AuthorScope.choices)
    author_account_id = models.UUIDField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)


class SettlementInquiryAttachmentReference(models.Model):
    attachment_reference_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    message = models.ForeignKey(
        SettlementInquiryMessage,
        on_delete=models.CASCADE,
        related_name="attachment_references",
    )
    daily_delivery_input_snapshot_id = models.UUIDField()
    service_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
