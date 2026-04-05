import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class DispatchPlan(models.Model):
    class DispatchStatus(models.TextChoices):
        DRAFT = "draft", "draft"
        PUBLISHED = "published", "published"
        CLOSED = "closed", "closed"

    dispatch_plan_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField()
    fleet_id = models.UUIDField()
    dispatch_date = models.DateField()
    planned_volume = models.PositiveIntegerField()
    dispatch_status = models.CharField(max_length=32, choices=DispatchStatus.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("dispatch_plan_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("fleet_id", "dispatch_date"),
                name="unique_dispatch_plan_per_fleet_date",
            )
        ]


class VehicleSchedule(models.Model):
    class ScheduleStatus(models.TextChoices):
        PLANNED = "planned", "planned"
        BLOCKED = "blocked", "blocked"
        CLOSED = "closed", "closed"

    vehicle_schedule_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle_id = models.UUIDField()
    fleet_id = models.UUIDField()
    dispatch_date = models.DateField()
    shift_slot = models.CharField(max_length=32)
    schedule_status = models.CharField(max_length=32, choices=ScheduleStatus.choices)
    starts_at = models.TimeField(null=True, blank=True)
    ends_at = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("vehicle_schedule_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("vehicle_id", "dispatch_date", "shift_slot"),
                name="unique_vehicle_schedule_per_vehicle_date_shift_slot",
            )
        ]

    def clean(self):
        errors = {}
        if self.starts_at and self.ends_at and self.starts_at > self.ends_at:
            errors["ends_at"] = "ends_at must be greater than or equal to starts_at."
        if errors:
            raise ValidationError(errors)


class OutsourcedDriver(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "active"
        ARCHIVED = "archived", "archived"

    outsourced_driver_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispatch_plan = models.ForeignKey(
        DispatchPlan,
        on_delete=models.CASCADE,
        related_name="outsourced_drivers",
        db_column="dispatch_plan_id",
    )
    name = models.CharField(max_length=120)
    contact_number = models.CharField(max_length=32)
    vehicle_note = models.CharField(max_length=255, blank=True, default="")
    memo = models.TextField(blank=True, default="")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("outsourced_driver_id",)

    def clean(self):
        errors = {}
        if self.status == self.Status.ACTIVE and self.archived_at is not None:
            errors["archived_at"] = "archived_at must be empty for active outsourced drivers."
        if self.status == self.Status.ARCHIVED and self.archived_at is None:
            errors["archived_at"] = "archived_at is required for archived outsourced drivers."
        if errors:
            raise ValidationError(errors)


class DispatchWorkRule(models.Model):
    class SystemKind(models.TextChoices):
        WORKING = "working", "working"
        DAY_OFF = "day_off", "day_off"
        OVERTIME = "overtime", "overtime"

    work_rule_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField()
    name = models.CharField(max_length=120)
    system_kind = models.CharField(max_length=32, choices=SystemKind.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("work_rule_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("company_id", "name"),
                name="unique_dispatch_work_rule_name_per_company",
            )
        ]


class DriverDayException(models.Model):
    driver_day_exception_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField()
    fleet_id = models.UUIDField()
    dispatch_date = models.DateField()
    driver_id = models.UUIDField()
    work_rule = models.ForeignKey(
        DispatchWorkRule,
        on_delete=models.PROTECT,
        related_name="driver_day_exceptions",
        db_column="work_rule_id",
    )
    memo = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("driver_day_exception_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("driver_id", "dispatch_date"),
                name="unique_driver_day_exception_per_driver_date",
            )
        ]

    def clean(self):
        errors = {}
        if self.work_rule_id and self.company_id != self.work_rule.company_id:
            errors["work_rule_id"] = "work_rule company must match company_id."
        if errors:
            raise ValidationError(errors)


class DispatchAssignment(models.Model):
    class AssignmentStatus(models.TextChoices):
        ASSIGNED = "assigned", "assigned"
        UNASSIGNED = "unassigned", "unassigned"

    dispatch_assignment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle_schedule = models.ForeignKey(
        VehicleSchedule,
        on_delete=models.CASCADE,
        related_name="dispatch_assignments",
        db_column="vehicle_schedule_id",
    )
    vehicle_id = models.UUIDField()
    driver_id = models.UUIDField(null=True, blank=True)
    outsourced_driver = models.ForeignKey(
        OutsourcedDriver,
        on_delete=models.PROTECT,
        related_name="dispatch_assignments",
        db_column="outsourced_driver_id",
        null=True,
        blank=True,
    )
    operator_company_id = models.UUIDField()
    dispatch_date = models.DateField()
    shift_slot = models.CharField(max_length=32)
    assignment_status = models.CharField(max_length=32, choices=AssignmentStatus.choices)
    assigned_at = models.DateTimeField()
    unassigned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("dispatch_assignment_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("vehicle_schedule",),
                condition=Q(assignment_status="assigned"),
                name="unique_assigned_dispatch_per_vehicle_schedule",
            )
        ]

    def clean(self):
        errors = {}
        has_internal_driver = self.driver_id is not None
        has_outsourced_driver = self.outsourced_driver_id is not None
        if has_internal_driver == has_outsourced_driver:
            message = "Exactly one of driver_id or outsourced_driver_id is required."
            errors["driver_id"] = message
            errors["outsourced_driver_id"] = message
        if self.vehicle_schedule_id:
            schedule = self.vehicle_schedule
            if self.vehicle_id != schedule.vehicle_id:
                errors["vehicle_id"] = "vehicle_id must match vehicle_schedule.vehicle_id."
            if self.dispatch_date != schedule.dispatch_date:
                errors["dispatch_date"] = "dispatch_date must match vehicle_schedule.dispatch_date."
            if self.shift_slot != schedule.shift_slot:
                errors["shift_slot"] = "shift_slot must match vehicle_schedule.shift_slot."
            if (
                self.assignment_status == self.AssignmentStatus.ASSIGNED
                and schedule.schedule_status != VehicleSchedule.ScheduleStatus.PLANNED
            ):
                errors["vehicle_schedule_id"] = "Assigned dispatch requires a planned vehicle schedule."
            if self.outsourced_driver_id:
                dispatch_plan = self.outsourced_driver.dispatch_plan
                if self.outsourced_driver.status != OutsourcedDriver.Status.ACTIVE:
                    errors["outsourced_driver_id"] = "outsourced_driver must be active."
                if schedule.fleet_id != dispatch_plan.fleet_id:
                    errors["outsourced_driver_id"] = (
                        "outsourced_driver dispatch_plan must match vehicle_schedule fleet."
                    )
                if self.dispatch_date != dispatch_plan.dispatch_date:
                    errors["outsourced_driver_id"] = (
                        "outsourced_driver dispatch_plan must match dispatch_date."
                    )
                if self.operator_company_id != dispatch_plan.company_id:
                    errors["operator_company_id"] = (
                        "operator_company_id must match outsourced_driver dispatch_plan company."
                    )
        if self.assignment_status == self.AssignmentStatus.ASSIGNED and self.unassigned_at is not None:
            errors["unassigned_at"] = "unassigned_at must be empty for assigned records."
        if self.assignment_status == self.AssignmentStatus.UNASSIGNED and self.unassigned_at is None:
            errors["unassigned_at"] = "unassigned_at is required for unassigned records."
        if errors:
            raise ValidationError(errors)
