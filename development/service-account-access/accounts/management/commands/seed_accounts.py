import os
from uuid import UUID

from django.core.management.base import BaseCommand

from accounts.models import Account

SEED_DRIVER_ACCOUNT_ID = UUID("20000000-0000-0000-0000-000000000001")


def _upsert_account(*, account_id=None, email: str, password: str, role: str) -> Account:
    lookup = {"email": email} if account_id is None else {"account_id": account_id}
    account, _ = Account.objects.get_or_create(
        **lookup,
        defaults={"email": email, "role": role, "is_active": True, "password_hash": ""},
    )
    account.email = email
    account.role = role
    account.is_active = True
    account.set_password(password)
    account.save()
    return account


class Command(BaseCommand):
    help = "Create or update the seeded admin account."

    def handle(self, *args, **options):
        email = os.environ.get("SEED_ADMIN_EMAIL")
        password = os.environ.get("SEED_ADMIN_PASSWORD")
        if not email or not password:
            raise ValueError("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.")

        account = _upsert_account(
            email=email,
            password=password,
            role=Account.Role.ADMIN,
        )

        driver_account_email = os.environ.get("SEED_DRIVER_ACCOUNT_EMAIL", "seed-driver@example.com")
        driver_account_password = os.environ.get("SEED_DRIVER_ACCOUNT_PASSWORD", "change-me-driver")
        driver_account = _upsert_account(
            account_id=SEED_DRIVER_ACCOUNT_ID,
            email=driver_account_email,
            password=driver_account_password,
            role=Account.Role.USER,
        )

        self.stdout.write(self.style.SUCCESS(f"Seeded admin account: {account.email}"))
        self.stdout.write(self.style.SUCCESS(f"Seeded driver-linked account: {driver_account.email}"))
