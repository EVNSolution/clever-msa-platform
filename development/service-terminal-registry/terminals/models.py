import uuid

from django.db import models
from django.db.models import Q


class TerminalRegistry(models.Model):
    class TerminalStatus(models.TextChoices):
        ACTIVE = "active", "active"
        INACTIVE = "inactive", "inactive"
        RETIRED = "retired", "retired"

    terminal_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    manufacturer_company_id = models.UUIDField()
    imei = models.CharField(max_length=64, unique=True)
    iccid = models.CharField(max_length=64, unique=True)
    firmware_version = models.CharField(max_length=64)
    protocol_version = models.CharField(max_length=64)
    app_version = models.CharField(max_length=64)
    terminal_status = models.CharField(max_length=32, choices=TerminalStatus.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("terminal_id",)


class TerminalInstallation(models.Model):
    class InstallationStatus(models.TextChoices):
        INSTALLED = "installed", "installed"
        REMOVED = "removed", "removed"

    terminal_installation_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    terminal = models.ForeignKey(
        TerminalRegistry,
        on_delete=models.CASCADE,
        related_name="installations",
        db_column="terminal_id",
    )
    vehicle_id = models.UUIDField()
    installation_status = models.CharField(
        max_length=32,
        choices=InstallationStatus.choices,
    )
    installed_at = models.DateTimeField()
    removed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("terminal_installation_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("terminal",),
                condition=Q(installation_status="installed"),
                name="terminals_one_active_installation_per_terminal",
            ),
            models.UniqueConstraint(
                fields=("vehicle_id",),
                condition=Q(installation_status="installed"),
                name="terminals_one_active_installation_per_vehicle",
            ),
        ]
