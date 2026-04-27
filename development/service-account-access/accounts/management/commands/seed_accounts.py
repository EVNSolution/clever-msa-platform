import os
import uuid
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
from accounts.services.company_manager_role_service import CompanyManagerRoleService


DEFAULT_SEED_MANAGER_COMPANY_ID = "30000000-0000-0000-0000-000000000001"
CONSENT_BOOTSTRAP_VERSION = "bootstrap"
DEFAULT_SEED_BIRTH_DATE = date(1970, 1, 1)
LEGACY_SEED_EMAILS = (
    "seed-company-super-admin@example.com",
    "seed-vehicle-manager@example.com",
    "seed-settlement-manager@example.com",
    "seed-fleet-manager@example.com",
    "seed-driver@example.com",
)


class Command(BaseCommand):
    help = "Bootstrap the initial system admin and default manager role identities/accounts."

    def _ensure_identity(self, *, name: str, email: str, password: str, now):
        email_credential = (
            EmailCredential.objects.select_related("identity_login_method__identity")
            .filter(email=email)
            .first()
        )
        if email_credential is None:
            identity = Identity.objects.create(
                name=name,
                birth_date=DEFAULT_SEED_BIRTH_DATE,
                status=Identity.Status.ACTIVE,
            )
            login_method = IdentityLoginMethod.objects.create(
                identity=identity,
                method_type=IdentityLoginMethod.MethodType.EMAIL,
                verified_at=now,
            )
            email_credential = EmailCredential.objects.create(
                identity_login_method=login_method,
                email=email,
                verified_at=now,
            )
        else:
            login_method = email_credential.identity_login_method
            identity = login_method.identity
            identity_updates = []
            if identity.name != name:
                identity.name = name
                identity_updates.append("name")
            if identity.birth_date != DEFAULT_SEED_BIRTH_DATE:
                identity.birth_date = DEFAULT_SEED_BIRTH_DATE
                identity_updates.append("birth_date")
            if identity.status != Identity.Status.ACTIVE:
                identity.status = Identity.Status.ACTIVE
                identity_updates.append("status")
            if identity_updates:
                identity.save(update_fields=identity_updates)
            login_updates = []
            if login_method.verified_at is None:
                login_method.verified_at = now
                login_updates.append("verified_at")
            if login_updates:
                login_method.save(update_fields=login_updates)
            email_updates = []
            if email_credential.verified_at is None:
                email_credential.verified_at = now
                email_updates.append("verified_at")
            if email_updates:
                email_credential.save(update_fields=email_updates)

        PasswordCredential.objects.update_or_create(
            identity=identity,
            defaults={"password_hash": make_password(password)},
        )
        IdentityConsentCurrent.objects.update_or_create(
            identity=identity,
            defaults={
                "privacy_policy_version": CONSENT_BOOTSTRAP_VERSION,
                "privacy_policy_consented": True,
                "privacy_policy_consented_at": now,
                "location_policy_version": CONSENT_BOOTSTRAP_VERSION,
                "location_policy_consented": True,
                "location_policy_consented_at": now,
            },
        )
        for consent_type in (
            IdentityConsentHistory.ConsentType.PRIVACY_POLICY,
            IdentityConsentHistory.ConsentType.LOCATION_POLICY,
        ):
            IdentityConsentHistory.objects.get_or_create(
                identity=identity,
                consent_type=consent_type,
                version=CONSENT_BOOTSTRAP_VERSION,
                defaults={"is_consented": True},
            )
        return identity

    def _ensure_active_link(self, *, identity: Identity, account_type: str, account_id, now) -> None:
        IdentityAccountLink.objects.filter(
            identity=identity,
            account_type=account_type,
            unlinked_at__isnull=True,
        ).exclude(account_id=account_id).update(unlinked_at=now)
        IdentityAccountLink.objects.get_or_create(
            identity=identity,
            account_type=account_type,
            account_id=account_id,
            unlinked_at=None,
        )

    def _delete_legacy_seed_accounts(self, *, current_admin_email: str) -> None:
        for legacy_email in LEGACY_SEED_EMAILS:
            if legacy_email == current_admin_email:
                continue
            email_credential = (
                EmailCredential.objects.select_related("identity_login_method__identity")
                .filter(email=legacy_email)
                .first()
            )
            if email_credential is None:
                continue
            email_credential.identity_login_method.identity.delete()

    def handle(self, *args, **options):
        email = os.environ.get("SEED_ADMIN_EMAIL")
        password = os.environ.get("SEED_ADMIN_PASSWORD")
        if not email or not password:
            raise ValueError("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.")
        manager_company_id = uuid.UUID(
            os.environ.get("SEED_MANAGER_COMPANY_ID", DEFAULT_SEED_MANAGER_COMPANY_ID)
        )

        now = timezone.now()
        with transaction.atomic():
            self._delete_legacy_seed_accounts(current_admin_email=email)
            if SystemAdminAccount.objects.filter(status=SystemAdminAccount.Status.ACTIVE).exists():
                self.stdout.write(
                    self.style.SUCCESS(
                        "Active system admin already exists. Skipping system admin bootstrap."
                    )
                )
            else:
                identity = self._ensure_identity(
                    name="System Admin",
                    email=email,
                    password=password,
                    now=now,
                )
                system_admin_account = SystemAdminAccount.objects.create(identity=identity)
                self._ensure_active_link(
                    identity=identity,
                    account_type=IdentityAccountLink.AccountType.SYSTEM_ADMIN,
                    account_id=system_admin_account.system_admin_account_id,
                    now=now,
                )
                self.stdout.write(self.style.SUCCESS(f"Seeded system admin identity: {email}"))

            CompanyManagerRoleService().ensure_default_roles(manager_company_id)
