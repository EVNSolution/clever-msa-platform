import uuid

from django.core.exceptions import ValidationError
from django.db import models


class SupportTicket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "open"
        IN_PROGRESS = "in_progress", "in_progress"
        RESOLVED = "resolved", "resolved"
        CLOSED = "closed", "closed"

    class Priority(models.TextChoices):
        LOW = "low", "low"
        MEDIUM = "medium", "medium"
        HIGH = "high", "high"

    ticket_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester_account_id = models.UUIDField(db_index=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=32, choices=Status.choices)
    priority = models.CharField(max_length=32, choices=Priority.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "ticket_id")


class SupportTicketResponse(models.Model):
    response_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="responses",
    )
    author_account_id = models.UUIDField()
    author_role = models.CharField(max_length=32)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at", "response_id")

    def clean(self):
        errors = {}
        if self.ticket_id and self.ticket.status == SupportTicket.Status.CLOSED:
            errors["ticket"] = ["response cannot be added to a closed ticket."]
        if errors:
            raise ValidationError(errors)
