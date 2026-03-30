import secrets
import uuid

from django.db import models


def generate_company_public_ref() -> str:
    return f"cmp_{secrets.token_hex(8)}"


def generate_fleet_public_ref() -> str:
    return f"flt_{secrets.token_hex(8)}"


class Company(models.Model):
    company_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    public_ref = models.CharField(
        max_length=20,
        unique=True,
        default=generate_company_public_ref,
        editable=False,
    )
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ("name",)


class Fleet(models.Model):
    fleet_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    public_ref = models.CharField(
        max_length=20,
        unique=True,
        default=generate_fleet_public_ref,
        editable=False,
    )
    company_id = models.UUIDField()
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ("name",)
