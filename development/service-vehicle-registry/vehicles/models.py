import uuid

from django.db import IntegrityError, models, transaction
from django.db.models import Q
from django.db.models import Max


class VehicleMaster(models.Model):
    class VehicleStatus(models.TextChoices):
        ACTIVE = "active", "active"
        INACTIVE = "inactive", "inactive"
        RETIRED = "retired", "retired"

    vehicle_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route_no = models.PositiveIntegerField(unique=True, null=True, editable=False)
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

    def save(self, *args, **kwargs):
        if self.route_no is not None:
            return super().save(*args, **kwargs)

        for _ in range(5):
            self.route_no = (type(self).objects.aggregate(max_route_no=Max("route_no"))["max_route_no"] or 0) + 1
            try:
                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError:
                self.route_no = None

        raise IntegrityError("Failed to allocate vehicle route_no.")


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
