import os
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.test import TestCase

from accounts.models import (
    EmailCredential,
    Identity,
    IdentityAccountLink,
    PasswordCredential,
    SystemAdminAccount,
)


class SeedAccountsCommandTests(TestCase):
    @patch.dict(
        os.environ,
        {
            "SEED_ADMIN_EMAIL": "admin@example.com",
            "SEED_ADMIN_PASSWORD": "change-me",
        },
        clear=False,
    )
    def test_seed_command_bootstraps_initial_system_admin_identity(self):
        call_command("seed_accounts", stdout=Mock())

        self.assertEqual(Identity.objects.count(), 1)
        self.assertEqual(SystemAdminAccount.objects.count(), 1)

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
        self.assertEqual(email_credential.email, "admin@example.com")
        self.assertTrue(PasswordCredential.objects.get(identity=identity))

    @patch.dict(
        os.environ,
        {
            "SEED_ADMIN_EMAIL": "admin@example.com",
            "SEED_ADMIN_PASSWORD": "change-me",
        },
        clear=False,
    )
    def test_seed_command_skips_when_active_system_admin_exists(self):
        call_command("seed_accounts", stdout=Mock())
        call_command("seed_accounts", stdout=Mock())

        self.assertEqual(Identity.objects.count(), 1)
        self.assertEqual(SystemAdminAccount.objects.count(), 1)
