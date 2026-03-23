"""Settlement payroll models used for local bootstrap and contract tests."""

import uuid

from django.db import models


class SettlementRunStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    CALCULATED = "calculated", "Calculated"
    REVIEWED = "reviewed", "Reviewed"
    APPROVED = "approved", "Approved"
    PAID = "paid", "Paid"
    CLOSED = "closed", "Closed"


class SettlementRun(models.Model):
    settlement_run_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField()
    fleet_id = models.UUIDField()
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=32, choices=SettlementRunStatus.choices)

    class Meta:
        ordering = ("period_start", "settlement_run_id")
        constraints = [
            models.CheckConstraint(
                check=models.Q(status__in=SettlementRunStatus.values),
                name="settlementrun_status_valid",
            )
        ]


class SettlementItem(models.Model):
    settlement_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    settlement_run = models.ForeignKey(
        SettlementRun,
        db_column="settlement_run_id",
        on_delete=models.CASCADE,
        related_name="items",
        to_field="settlement_run_id",
    )
    driver_id = models.UUIDField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout_status = models.CharField(max_length=32)

    class Meta:
        ordering = ("settlement_item_id",)
