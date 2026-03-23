import uuid

from django.db import models
from django.db.models import Q


class VehicleMaster(models.Model):
    class VehicleStatus(models.TextChoices):
        ACTIVE = "active", "active"
        INACTIVE = "inactive", "inactive"
        RETIRED = "retired", "retired"

    vehicle_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    manufacturer_company_id = models.UUIDField()
    plate_number = models.CharField(max_length=64, unique=True)
    vin = models.CharField(max_length=64, unique=True)
    manufacturer_vehicle_code = models.CharField(max_length=64, null=True, blank=True)
    model_name = models.CharField(max_length=128)
    vehicle_status = models.CharField(
        max_length=32,
        choices=VehicleStatus.choices,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("vehicle_id",)


class VehicleOperatorAccess(models.Model):
    class AccessStatus(models.TextChoices):
        ACTIVE = "active", "active"
        SUSPENDED = "suspended", "suspended"
        ENDED = "ended", "ended"

    vehicle_operator_access_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    vehicle = models.ForeignKey(
        VehicleMaster,
        on_delete=models.CASCADE,
        related_name="operator_accesses",
        db_column="vehicle_id",
    )
    operator_company_id = models.UUIDField()
    access_status = models.CharField(
        max_length=32,
        choices=AccessStatus.choices,
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("vehicle_operator_access_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("vehicle",),
                condition=Q(access_status="active"),
                name="vehicles_one_active_operator_access_per_vehicle",
            ),
        ]
