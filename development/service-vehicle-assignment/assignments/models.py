import uuid

from django.db import IntegrityError, models, transaction
from django.db.models import Max
from django.db.models import Q


class DriverVehicleAssignment(models.Model):
    class AssignmentStatus(models.TextChoices):
        ASSIGNED = "assigned", "assigned"
        UNASSIGNED = "unassigned", "unassigned"

    driver_vehicle_assignment_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    route_no = models.PositiveIntegerField(unique=True, null=True, editable=False)
    driver_id = models.UUIDField()
    vehicle_id = models.UUIDField()
    operator_company_id = models.UUIDField()
    assignment_status = models.CharField(
        max_length=32,
        choices=AssignmentStatus.choices,
    )
    assigned_at = models.DateTimeField()
    unassigned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("driver_vehicle_assignment_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("vehicle_id",),
                condition=Q(assignment_status="assigned"),
                name="unique_assigned_vehicle_id",
            )
        ]

    def save(self, *args, **kwargs):
        if self.route_no is not None:
            return super().save(*args, **kwargs)

        for _ in range(5):
            self.route_no = (
                type(self).objects.aggregate(max_route_no=Max("route_no"))["max_route_no"]
                or 0
            ) + 1
            try:
                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError:
                self.route_no = None

        raise IntegrityError("Failed to allocate assignment route_no.")
