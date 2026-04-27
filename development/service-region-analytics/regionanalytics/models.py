from decimal import Decimal
import uuid

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class RegionDailyStatistic(models.Model):
    region_daily_statistic_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region_id = models.UUIDField()
    region_code_snapshot = models.CharField(max_length=64)
    service_date = models.DateField()
    delivery_count = models.PositiveIntegerField()
    completed_delivery_count = models.PositiveIntegerField()
    exception_delivery_count = models.PositiveIntegerField(default=0)
    total_distance_km = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    total_base_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    average_delivery_minutes = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("service_date", "region_code_snapshot")
        constraints = [
            models.UniqueConstraint(
                fields=("region_id", "service_date"),
                name="unique_region_daily_statistic_per_region_date",
            )
        ]

    def clean(self):
        errors = {}

        if self.completed_delivery_count > self.delivery_count:
            errors["completed_delivery_count"] = [
                "completed_delivery_count must be less than or equal to delivery_count."
            ]
        if self.exception_delivery_count > self.delivery_count:
            errors["exception_delivery_count"] = [
                "exception_delivery_count must be less than or equal to delivery_count."
            ]
        if self.completed_delivery_count + self.exception_delivery_count > self.delivery_count:
            errors["delivery_count"] = [
                "completed_delivery_count plus exception_delivery_count must be less than or equal to delivery_count."
            ]

        if errors:
            raise ValidationError(errors)


class RegionPerformanceSummary(models.Model):
    class DifficultyLevel(models.TextChoices):
        LOW = "low", "low"
        MEDIUM = "medium", "medium"
        HIGH = "high", "high"

    region_performance_summary_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region_id = models.UUIDField()
    region_code_snapshot = models.CharField(max_length=64)
    difficulty_level_snapshot = models.CharField(max_length=32, choices=DifficultyLevel.choices)
    period_start = models.DateField()
    period_end = models.DateField()
    delivery_count = models.PositiveIntegerField()
    completion_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    productivity_score = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    cost_per_delivery = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("period_start", "region_code_snapshot")
        constraints = [
            models.UniqueConstraint(
                fields=("region_id", "period_start", "period_end"),
                name="unique_region_performance_summary_per_region_period",
            )
        ]

    def clean(self):
        errors = {}

        if self.period_end < self.period_start:
            errors["period_end"] = ["period_end must be greater than or equal to period_start."]

        if errors:
            raise ValidationError(errors)
