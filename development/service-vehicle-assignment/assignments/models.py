import uuid

from django.db import models
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
