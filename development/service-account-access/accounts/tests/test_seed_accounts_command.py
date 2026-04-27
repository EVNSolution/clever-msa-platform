import os
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.test import TestCase

from accounts.models import (
    CompanyManagerRole,
    EmailCredential,
    Identity,
    IdentityAccountLink,
    PasswordCredential,
    SystemAdminAccount,
)


class SeedAccountsCommandTests(TestCase):
    seed_admin_email = "seed-admin@example.com"
    seed_admin_password = "ChangeMe123!"
    seed_manager_company_id = "30000000-0000-0000-0000-000000000001"

    @patch.dict(
        os.environ,
        {
            "SEED_ADMIN_EMAIL": seed_admin_email,
            "SEED_ADMIN_PASSWORD": seed_admin_password,
            "SEED_MANAGER_COMPANY_ID": seed_manager_company_id,
        },
        clear=False,
    )
    def test_seed_command_bootstraps_initial_system_admin_identity(self):
        call_command("seed_accounts", stdout=Mock())

        self.assertEqual(Identity.objects.count(), 1)
        self.assertEqual(SystemAdminAccount.objects.count(), 1)
        self.assertEqual(
            EmailCredential.objects.values_list("email", flat=True).get(),
            self.seed_admin_email,
        )
        self.assertEqual(CompanyManagerRole.objects.count(), 4)

        identity = Identity.objects.get(name="System Admin")
        self.assertEqual(str(identity.birth_date), "1970-01-01")
        self.assertEqual(identity.status, Identity.Status.ACTIVE)

        system_admin_account = SystemAdminAccount.objects.get(identity=identity)
        self.assertEqual(system_admin_account.status, SystemAdminAccount.Status.ACTIVE)
        self.assertTrue(
            IdentityAccountLink.objects.filter(
                identity=identity,
                account_type=IdentityAccountLink.AccountType.SYSTEM_ADMIN,
                account_id=system_admin_account.system_admin_account_id,
            ).exists()
        )

        email_credential = EmailCredential.objects.get(identity_login_method__identity=identity)
        self.assertEqual(email_credential.email, self.seed_admin_email)
        self.assertTrue(PasswordCredential.objects.get(identity=identity))
        self.assertFalse(
            IdentityAccountLink.objects.filter(
                account_type=IdentityAccountLink.AccountType.MANAGER
            ).exists()
        )

    @patch.dict(
        os.environ,
        {
            "SEED_ADMIN_EMAIL": seed_admin_email,
            "SEED_ADMIN_PASSWORD": seed_admin_password,
            "SEED_MANAGER_COMPANY_ID": seed_manager_company_id,
        },
        clear=False,
    )
    def test_seed_command_skips_when_active_system_admin_exists(self):
        call_command("seed_accounts", stdout=Mock())
        call_command("seed_accounts", stdout=Mock())

        self.assertEqual(Identity.objects.count(), 1)
        self.assertEqual(SystemAdminAccount.objects.count(), 1)
        self.assertEqual(CompanyManagerRole.objects.count(), 4)

    @patch.dict(
        os.environ,
        {
            "SEED_ADMIN_EMAIL": seed_admin_email,
            "SEED_ADMIN_PASSWORD": seed_admin_password,
            "SEED_MANAGER_COMPANY_ID": seed_manager_company_id,
        },
        clear=False,
    )
    def test_seed_command_preserves_existing_system_admin_when_system_admin_already_exists(self):
        identity = Identity.objects.create(
            name="Existing System Admin",
            birth_date="1970-01-01",
            status=Identity.Status.ACTIVE,
        )
        SystemAdminAccount.objects.create(identity=identity)

        call_command("seed_accounts", stdout=Mock())

        self.assertEqual(SystemAdminAccount.objects.count(), 1)
        self.assertEqual(CompanyManagerRole.objects.count(), 4)

    @patch.dict(
        os.environ,
        {
            "SEED_ADMIN_EMAIL": seed_admin_email,
            "SEED_ADMIN_PASSWORD": seed_admin_password,
            "SEED_MANAGER_COMPANY_ID": seed_manager_company_id,
        },
        clear=False,
    )
    def test_seed_command_deletes_legacy_seed_identities(self):
        for email in (
            "seed-company-super-admin@example.com",
            "seed-vehicle-manager@example.com",
            "seed-settlement-manager@example.com",
            "seed-fleet-manager@example.com",
        ):
            identity = Identity.objects.create(
                name=f"Legacy {email}",
                birth_date="1970-01-01",
                status=Identity.Status.ACTIVE,
            )
            login_method = identity.login_methods.create(method_type="email")
            EmailCredential.objects.create(identity_login_method=login_method, email=email)

        call_command("seed_accounts", stdout=Mock())

        self.assertEqual(Identity.objects.count(), 1)
        self.assertFalse(
            EmailCredential.objects.filter(
                email__in=[
                    "seed-company-super-admin@example.com",
                    "seed-vehicle-manager@example.com",
                    "seed-settlement-manager@example.com",
                    "seed-fleet-manager@example.com",
                ]
            ).exists()
        )
