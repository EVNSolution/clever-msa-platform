import os
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.test import TestCase

from accounts.models import Account


class SeedAccountsCommandTests(TestCase):
    @patch.dict(
        os.environ,
        {
            "SEED_ADMIN_EMAIL": "admin@example.com",
            "SEED_ADMIN_PASSWORD": "change-me",
            "SEED_DRIVER_ACCOUNT_EMAIL": "seed-driver@example.com",
            "SEED_DRIVER_ACCOUNT_PASSWORD": "change-me-driver",
        },
        clear=False,
    )
    def test_seed_command_creates_admin_and_linked_driver_account(self):
        call_command("seed_accounts", stdout=Mock())

        self.assertEqual(Account.objects.count(), 2)

        admin = Account.objects.get(email="admin@example.com")
        self.assertEqual(admin.role, Account.Role.ADMIN)
        self.assertTrue(admin.is_active)
        self.assertTrue(admin.check_password("change-me"))

        linked_driver_account = Account.objects.get(
            account_id="20000000-0000-0000-0000-000000000001"
        )
        self.assertEqual(linked_driver_account.email, "seed-driver@example.com")
        self.assertEqual(linked_driver_account.role, Account.Role.USER)
        self.assertTrue(linked_driver_account.is_active)
        self.assertTrue(linked_driver_account.check_password("change-me-driver"))
