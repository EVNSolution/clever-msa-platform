import uuid

from django.db import models


class DriverProfile(models.Model):
    driver_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_id = models.UUIDField(null=True, blank=True)
    company_id = models.UUIDField()
    fleet_id = models.UUIDField()
    name = models.CharField(max_length=255)
    ev_id = models.CharField(max_length=64)
    phone_number = models.CharField(max_length=32)
    address = models.CharField(max_length=255)

    class Meta:
        ordering = ("driver_id",)
