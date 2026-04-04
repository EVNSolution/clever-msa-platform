import os
from datetime import date

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import (
    EmailCredential,
    Identity,
    IdentityAccountLink,
    IdentityConsentCurrent,
    IdentityConsentHistory,
    IdentityLoginMethod,
    PasswordCredential,
    SystemAdminAccount,
)


class Command(BaseCommand):
    help = "Bootstrap the initial system admin identity/account."

    def handle(self, *args, **options):
        email = os.environ.get("SEED_ADMIN_EMAIL")
        password = os.environ.get("SEED_ADMIN_PASSWORD")
        if not email or not password:
            raise ValueError("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.")

        if SystemAdminAccount.objects.filter(status=SystemAdminAccount.Status.ACTIVE).exists():
            self.stdout.write(self.style.SUCCESS("Active system admin already exists. Skipping bootstrap."))
            return

        now = timezone.now()
        with transaction.atomic():
            identity = Identity.objects.create(
                name="System Admin",
                birth_date=date(1970, 1, 1),
                status=Identity.Status.ACTIVE,
            )
            login_method = IdentityLoginMethod.objects.create(
                identity=identity,
                method_type=IdentityLoginMethod.MethodType.EMAIL,
                verified_at=now,
            )
            EmailCredential.objects.create(
                identity_login_method=login_method,
                email=email,
                verified_at=now,
            )
            PasswordCredential.objects.create(
                identity=identity,
                password_hash=make_password(password),
            )
            IdentityConsentCurrent.objects.create(
                identity=identity,
                privacy_policy_version="bootstrap",
                privacy_policy_consented=True,
                privacy_policy_consented_at=now,
                location_policy_version="bootstrap",
                location_policy_consented=True,
                location_policy_consented_at=now,
            )
            IdentityConsentHistory.objects.bulk_create(
                [
                    IdentityConsentHistory(
                        identity=identity,
                        consent_type=IdentityConsentHistory.ConsentType.PRIVACY_POLICY,
                        version="bootstrap",
                        is_consented=True,
                    ),
                    IdentityConsentHistory(
                        identity=identity,
                        consent_type=IdentityConsentHistory.ConsentType.LOCATION_POLICY,
                        version="bootstrap",
                        is_consented=True,
                    ),
                ]
            )
            system_admin_account = SystemAdminAccount.objects.create(identity=identity)
            IdentityAccountLink.objects.create(
                identity=identity,
                account_type=IdentityAccountLink.AccountType.SYSTEM_ADMIN,
                account_id=system_admin_account.system_admin_account_id,
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded system admin identity: {email}"))
