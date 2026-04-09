from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import (
    CompanyManagerRole,
    EmailCredential,
    Identity,
    IdentityConsentCurrent,
    IdentityLoginMethod,
    ManagerAccount,
    PasswordCredential,
)


class IdentitySessionRoleDisplayApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.company_id = "30000000-0000-0000-0000-000000000001"

    def _create_identity_with_manager_role(self, *, email: str, password: str, role_type: str, role_display_name: str):
        identity = Identity.objects.create(name="커스텀 관리자", birth_date="1990-01-02")
        now = timezone.now()
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
            privacy_policy_version="v1.0",
            privacy_policy_consented=True,
            privacy_policy_consented_at=now,
            location_policy_version="v1.0",
            location_policy_consented=True,
            location_policy_consented_at=now,
        )
        CompanyManagerRole.objects.create(
            company_id=self.company_id,
            code=role_type,
            display_name=role_display_name,
            is_system_required=False,
            is_default=False,
            allowed_nav_keys=["dashboard", "accounts"],
        )
        manager_account = ManagerAccount.objects.create(
            identity=identity,
            company_id=self.company_id,
            role_type=role_type,
        )
        return identity, manager_account

    def test_identity_login_and_me_include_custom_role_display_name(self):
        identity, manager_account = self._create_identity_with_manager_role(
            email="custom-role@example.com",
            password="custom-role-pass-123",
            role_type="custom_dispatch_manager",
            role_display_name="배차 운영 관리자",
        )

        login_response = self.client.post(
            "/identity-login/",
            {"email": "custom-role@example.com", "password": "custom-role-pass-123"},
            format="json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.data["active_account"]["role_type"], "custom_dispatch_manager")
        self.assertEqual(login_response.data["active_account"]["role_display_name"], "배차 운영 관리자")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access_token']}")
        me_response = self.client.get("/identity-me/")

        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.data["identity"]["identity_id"], str(identity.identity_id))
        self.assertEqual(me_response.data["active_account"]["account_id"], str(manager_account.manager_account_id))
        self.assertEqual(me_response.data["active_account"]["role_display_name"], "배차 운영 관리자")

    def test_identity_refresh_preserves_custom_role_display_name(self):
        self._create_identity_with_manager_role(
            email="refresh-custom-role@example.com",
            password="refresh-custom-role-pass-123",
            role_type="custom_safety_manager",
            role_display_name="안전 관리자",
        )

        login_response = self.client.post(
            "/identity-login/",
            {"email": "refresh-custom-role@example.com", "password": "refresh-custom-role-pass-123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        self.client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        refresh_response = self.client.post("/identity-refresh/")

        self.assertEqual(refresh_response.status_code, 200)
        self.assertEqual(refresh_response.data["active_account"]["role_type"], "custom_safety_manager")
        self.assertEqual(refresh_response.data["active_account"]["role_display_name"], "안전 관리자")
