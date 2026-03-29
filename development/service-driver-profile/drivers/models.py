import uuid

from django.db import models


class DriverProfile(models.Model):
    class EmploymentStatus(models.TextChoices):
        ONBOARDING = "onboarding", "onboarding"
        ACTIVE = "active", "active"
        LEAVE = "leave", "leave"
        RESIGNED = "resigned", "resigned"
        RETIRED = "retired", "retired"

    class QualificationStatus(models.TextChoices):
        PENDING_REVIEW = "pending_review", "pending_review"
        QUALIFIED = "qualified", "qualified"
        RESTRICTED = "restricted", "restricted"
        EXPIRED = "expired", "expired"
        REVOKED = "revoked", "revoked"

    driver_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_id = models.UUIDField(null=True, blank=True)
    company_id = models.UUIDField()
    fleet_id = models.UUIDField()
    name = models.CharField(max_length=255)
    ev_id = models.CharField(max_length=64)
    phone_number = models.CharField(max_length=32)
    address = models.CharField(max_length=255)
    employment_status = models.CharField(
        max_length=32,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )
    qualification_status = models.CharField(
        max_length=32,
        choices=QualificationStatus.choices,
        default=QualificationStatus.QUALIFIED,
    )

    class Meta:
        ordering = ("driver_id",)
