import secrets
import uuid

from django.db import IntegrityError, models, transaction
from django.db.models import Max


def generate_company_public_ref() -> str:
    return f"cmp_{secrets.token_hex(8)}"


def generate_fleet_public_ref() -> str:
    return f"flt_{secrets.token_hex(8)}"


class Company(models.Model):
    company_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route_no = models.PositiveIntegerField(unique=True, editable=False)
    public_ref = models.CharField(
        max_length=20,
        unique=True,
        default=generate_company_public_ref,
        editable=False,
    )
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ("name",)

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

        raise IntegrityError("Failed to allocate company route_no.")


class Fleet(models.Model):
    fleet_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route_no = models.PositiveIntegerField(unique=True, editable=False)
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

        raise IntegrityError("Failed to allocate fleet route_no.")
