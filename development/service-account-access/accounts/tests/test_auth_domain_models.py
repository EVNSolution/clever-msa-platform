import uuid
from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from accounts import models as account_models


class AuthDomainModelTests(TestCase):
    def test_identity_model_exists_and_defaults_active(self):
        self.assertTrue(hasattr(account_models, "Identity"))

        Identity = account_models.Identity
        identity = Identity.objects.create(
            name="홍길동",
            birth_date=date(1990, 1, 2),
        )

        self.assertEqual(identity.status, Identity.Status.ACTIVE)
        self.assertEqual(str(identity), "홍길동")

    def test_system_admin_account_exists_and_defaults_active(self):
        self.assertTrue(hasattr(account_models, "SystemAdminAccount"))
        self.assertTrue(hasattr(account_models, "Identity"))

        Identity = account_models.Identity
        SystemAdminAccount = account_models.SystemAdminAccount
        identity = Identity.objects.create(
            name="시스템 관리자",
            birth_date=date(1970, 1, 1),
        )

        account = SystemAdminAccount.objects.create(identity=identity)

        self.assertEqual(account.status, SystemAdminAccount.Status.ACTIVE)

    def test_identity_cannot_have_multiple_active_manager_accounts(self):
        self.assertTrue(hasattr(account_models, "Identity"))
        self.assertTrue(hasattr(account_models, "ManagerAccount"))

        Identity = account_models.Identity
        ManagerAccount = account_models.ManagerAccount
        identity = Identity.objects.create(
            name="관리자",
            birth_date=date(1991, 2, 3),
        )
        company_id = uuid.uuid4()
        ManagerAccount.objects.create(
            identity=identity,
            company_id=company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        duplicate = ManagerAccount(
            identity=identity,
            company_id=company_id,
            role_type=ManagerAccount.RoleType.SETTLEMENT_MANAGER,
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_active_manager_and_driver_accounts_must_share_company(self):
        self.assertTrue(hasattr(account_models, "Identity"))
        self.assertTrue(hasattr(account_models, "ManagerAccount"))
        self.assertTrue(hasattr(account_models, "DriverAccount"))

        Identity = account_models.Identity
        ManagerAccount = account_models.ManagerAccount
        DriverAccount = account_models.DriverAccount
        identity = Identity.objects.create(
            name="겸직 사용자",
            birth_date=date(1992, 3, 4),
        )
        manager_company_id = uuid.uuid4()
        ManagerAccount.objects.create(
            identity=identity,
            company_id=manager_company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

        driver_account = DriverAccount(
            identity=identity,
            company_id=uuid.uuid4(),
        )

        with self.assertRaises(ValidationError):
            driver_account.full_clean()

    def test_signup_request_supports_pending_and_awaiting_setup_statuses(self):
        self.assertTrue(hasattr(account_models, "Identity"))
        self.assertTrue(hasattr(account_models, "IdentitySignupRequest"))

        Identity = account_models.Identity
        IdentitySignupRequest = account_models.IdentitySignupRequest
        identity = Identity.objects.create(
            name="요청 사용자",
            birth_date=date(1993, 4, 5),
        )

        request = IdentitySignupRequest.objects.create(
            identity=identity,
            company_id=uuid.uuid4(),
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )

        self.assertEqual(request.status, IdentitySignupRequest.Status.PENDING)

        request.status = IdentitySignupRequest.Status.AWAITING_SETUP
        request.full_clean()
