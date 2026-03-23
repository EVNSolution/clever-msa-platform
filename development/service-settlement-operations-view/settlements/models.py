"""Placeholder settlement models kept for bootstrap reads and writes only."""

import uuid

from django.db import models


class SettlementRun(models.Model):
    settlement_run_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField()
    fleet_id = models.UUIDField()
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=32)

    class Meta:
        ordering = ("period_start", "settlement_run_id")


class SettlementItem(models.Model):
    settlement_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    settlement_run_id = models.UUIDField()
    driver_id = models.UUIDField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout_status = models.CharField(max_length=32)

    class Meta:
        ordering = ("settlement_item_id",)
