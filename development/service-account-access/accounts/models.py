import secrets
import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.db import IntegrityError, models, transaction
from django.db.models import Max


def generate_account_public_ref() -> str:
    return f"acc_{secrets.token_hex(8)}"


class Account(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        USER = "user", "User"

    account_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route_no = models.PositiveIntegerField(unique=True, null=True, editable=False)
    public_ref = models.CharField(
        max_length=20,
        unique=True,
        default=generate_account_public_ref,
        editable=False,
    )
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=128)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("email",)

    def __str__(self) -> str:
        return self.email

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    def set_password(self, raw_password: str) -> None:
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.password_hash)

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

        raise IntegrityError("Failed to allocate account route_no.")
