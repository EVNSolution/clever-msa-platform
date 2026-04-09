from django.contrib.auth.hashers import check_password, make_password
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from unittest.mock import patch

from accounts.models import (
    CompanyManagerRole,
    DriverAccount,
    DriverAccountLink,
    EmailCredential,
    Identity,
    IdentityAccountLink,
    IdentityConsentCurrent,
    IdentityConsentHistory,
    IdentityLoginMethod,
    IdentitySignupRequest,
    ManagerAccount,
    PasswordCredential,
    PhoneCredential,
    SocialCredential,
    SystemAdminAccount,
)
from accounts.session_principal import IdentitySessionPrincipal
from accounts.services.refresh_registry import RefreshRegistry
from accounts.services.jwt_service import decode_token


class SignupIntakeApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    def test_signup_request_intake_creates_identity_credentials_consents_and_request(self):
        response = self.client.post(
            "/identity-signup-requests/",
            {
                "name": "홍길동",
                "birth_date": "1990-01-02",
                "email": "hong@example.com",
                "password": "signup-pass-123",
                "company_id": "30000000-0000-0000-0000-000000000001",
                "request_types": [
                    IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
                ],
                "privacy_policy_version": "v1.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v1.0",
                "location_policy_consented": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "홍길동")
        self.assertEqual(len(response.data["requests"]), 1)
        self.assertEqual(
            response.data["requests"][0]["request_type"],
            IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        self.assertEqual(response.data["requests"][0]["status"], IdentitySignupRequest.Status.PENDING)

        identity = Identity.objects.get(identity_id=response.data["identity_id"])
        self.assertEqual(identity.birth_date.isoformat(), "1990-01-02")

        login_method = IdentityLoginMethod.objects.get(identity=identity)
        self.assertEqual(login_method.method_type, IdentityLoginMethod.MethodType.EMAIL)
        self.assertIsNotNone(login_method.verified_at)

        email_credential = EmailCredential.objects.get(identity_login_method=login_method)
        self.assertEqual(email_credential.email, "hong@example.com")

        password_credential = PasswordCredential.objects.get(identity=identity)
        self.assertTrue(check_password("signup-pass-123", password_credential.password_hash))

        consent_current = IdentityConsentCurrent.objects.get(identity=identity)
        self.assertEqual(consent_current.privacy_policy_version, "v1.0")
        self.assertEqual(consent_current.location_policy_version, "v1.0")

        consent_types = set(
            IdentityConsentHistory.objects.filter(identity=identity).values_list("consent_type", flat=True)
        )
        self.assertEqual(
            consent_types,
            {
                IdentityConsentHistory.ConsentType.PRIVACY_POLICY,
                IdentityConsentHistory.ConsentType.LOCATION_POLICY,
            },
        )

    def test_signup_request_intake_supports_creating_both_manager_and_driver_requests(self):
        response = self.client.post(
            "/identity-signup-requests/",
            {
                "name": "김둘다",
                "birth_date": "1992-03-04",
                "email": "dual@example.com",
                "password": "signup-pass-123",
                "company_id": "30000000-0000-0000-0000-000000000001",
                "request_types": [
                    IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
                    IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
                ],
                "privacy_policy_version": "v1.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v1.0",
                "location_policy_consented": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["requests"]), 2)
        self.assertEqual(
            set(
                IdentitySignupRequest.objects.filter(identity_id=response.data["identity_id"]).values_list(
                    "request_type",
                    flat=True,
                )
            ),
            {
                IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
                IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
            },
        )

    def test_signup_request_intake_requires_both_mandatory_consents(self):
        response = self.client.post(
            "/identity-signup-requests/",
            {
                "name": "동의없음",
                "birth_date": "1994-05-06",
                "email": "blocked@example.com",
                "password": "signup-pass-123",
                "company_id": "30000000-0000-0000-0000-000000000001",
                "request_types": [
                    IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
                ],
                "privacy_policy_version": "v1.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v1.0",
                "location_policy_consented": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("location_policy_consented", response.data["details"])
        self.assertFalse(Identity.objects.filter(name="동의없음").exists())

    @patch("accounts.serializers.SocialProviderService.resolve_subject")
    def test_signup_request_intake_supports_social_only_identity(self, resolve_subject):
        resolve_subject.return_value = {
            "provider_type": SocialCredential.ProviderType.KAKAO,
            "provider_subject": "kakao-user-123",
        }

        response = self.client.post(
            "/identity-signup-requests/",
            {
                "name": "카카오신규",
                "birth_date": "1993-04-05",
                "company_id": "30000000-0000-0000-0000-000000000001",
                "request_types": [
                    IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
                ],
                "provider_type": SocialCredential.ProviderType.KAKAO,
                "provider_access_token": "kakao-access-token",
                "privacy_policy_version": "v1.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v1.0",
                "location_policy_consented": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        identity = Identity.objects.get(identity_id=response.data["identity_id"])
        login_method = IdentityLoginMethod.objects.get(identity=identity)
        self.assertEqual(login_method.method_type, IdentityLoginMethod.MethodType.SOCIAL)
        self.assertTrue(
            SocialCredential.objects.filter(
                identity_login_method=login_method,
                provider_type=SocialCredential.ProviderType.KAKAO,
                provider_subject="kakao-user-123",
            ).exists()
        )
        self.assertFalse(PasswordCredential.objects.filter(identity=identity).exists())


class IdentityRequestApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()
        self.company_id = "30000000-0000-0000-0000-000000000001"
        self.other_company_id = "30000000-0000-0000-0000-000000000002"

    def _create_identity_with_password(
        self,
        *,
        name: str,
        birth_date: str,
        email: str,
        password: str,
    ) -> Identity:
        identity = Identity.objects.create(name=name, birth_date=birth_date)
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
            privacy_policy_consented_at=now,
            location_policy_version="v1.0",
            location_policy_consented_at=now,
        )
        return identity

    def _login_identity(self, email: str, password: str):
        response = self.client.post(
            "/identity-login/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")
        if "refresh_token" in response.cookies:
            self.client.cookies["refresh_token"] = response.cookies["refresh_token"].value
        return response

    def _create_request(
        self,
        *,
        identity: Identity,
        company_id: str,
        request_type: str,
        status: str = IdentitySignupRequest.Status.PENDING,
    ) -> IdentitySignupRequest:
        return IdentitySignupRequest.objects.create(
            identity=identity,
            company_id=company_id,
            request_type=request_type,
            status=status,
        )

    def test_identity_login_allows_pending_identity_without_active_account(self):
        self._create_identity_with_password(
            name="대기 사용자",
            birth_date="1990-01-02",
            email="waiting@example.com",
            password="waiting-pass-123",
        )

        response = self._login_identity("waiting@example.com", "waiting-pass-123")

        self.assertEqual(response.data["identity"]["name"], "대기 사용자")
        self.assertIsNone(response.data["active_account"])
        self.assertEqual(response.data["available_account_types"], [])

    def test_identity_user_can_list_and_cancel_own_active_request(self):
        identity = self._create_identity_with_password(
            name="셀프 요청자",
            birth_date="1990-01-02",
            email="self@example.com",
            password="self-pass-123",
        )
        request = self._create_request(
            identity=identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        self._login_identity("self@example.com", "self-pass-123")

        list_response = self.client.get("/identity-signup-requests/me/")
        cancel_response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/cancel/",
            format="json",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data["requests"]), 1)
        self.assertEqual(cancel_response.status_code, 200)
        request.refresh_from_db()
        self.assertEqual(request.status, IdentitySignupRequest.Status.REJECTED)
        self.assertEqual(request.reject_reason, "user_cancelled")

    def test_identity_user_can_create_new_driver_request_for_selected_company(self):
        identity = self._create_identity_with_password(
            name="신규 요청자",
            birth_date="1990-01-02",
            email="new-request@example.com",
            password="new-request-pass-123",
        )
        self._login_identity("new-request@example.com", "new-request-pass-123")

        response = self.client.post(
            "/identity-signup-requests/me/",
            {
                "company_id": self.company_id,
                "request_type": IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["identity"]["identity_id"], str(identity.identity_id))
        self.assertEqual(response.data["request_type"], IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE)
        self.assertEqual(response.data["company_id"], self.company_id)
        self.assertEqual(response.data["status"], IdentitySignupRequest.Status.PENDING)

    def test_identity_user_cannot_create_duplicate_pending_request_for_same_scope(self):
        identity = self._create_identity_with_password(
            name="중복 요청자",
            birth_date="1990-01-02",
            email="duplicate-request@example.com",
            password="duplicate-request-pass-123",
        )
        self._create_request(
            identity=identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
        )
        self._login_identity("duplicate-request@example.com", "duplicate-request-pass-123")

        response = self.client.post(
            "/identity-signup-requests/me/",
            {
                "company_id": self.company_id,
                "request_type": IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("request_type", response.data["details"])

    def test_identity_user_creates_company_change_rerequest_for_existing_manager_account(self):
        identity = self._create_identity_with_password(
            name="회사 변경 관리자",
            birth_date="1990-01-02",
            email="manager-rerequest@example.com",
            password="manager-rerequest-pass-123",
        )
        ManagerAccount.objects.create(
            identity=identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        self._login_identity("manager-rerequest@example.com", "manager-rerequest-pass-123")

        response = self.client.post(
            "/identity-signup-requests/me/",
            {
                "company_id": self.other_company_id,
                "request_type": IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
                "is_re_request": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["request_type"], IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE)
        self.assertEqual(response.data["company_id"], self.other_company_id)

        created_request = IdentitySignupRequest.objects.get(
            identity=identity,
            company_id=self.other_company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        self.assertTrue(created_request.is_re_request)
        self.assertEqual(str(created_request.from_company_id), self.company_id)

    def test_manager_company_change_rerequest_archives_old_accounts_and_creates_new_driver_account(self):
        system_identity = self._create_identity_with_password(
            name="시스템 관리자",
            birth_date="1980-01-01",
            email="sys-rerequest@example.com",
            password="sys-rerequest-pass-123",
        )
        SystemAdminAccount.objects.create(identity=system_identity)
        request_identity = self._create_identity_with_password(
            name="회사 이동 사용자",
            birth_date="1990-01-02",
            email="company-change@example.com",
            password="company-change-pass-123",
        )
        old_manager = ManagerAccount.objects.create(
            identity=request_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        IdentityAccountLink.objects.create(
            identity=request_identity,
            account_type=IdentityAccountLink.AccountType.MANAGER,
            account_id=old_manager.manager_account_id,
        )
        old_driver = DriverAccount.objects.create(
            identity=request_identity,
            company_id=self.company_id,
            status=DriverAccount.Status.ACTIVE,
        )
        IdentityAccountLink.objects.create(
            identity=request_identity,
            account_type=IdentityAccountLink.AccountType.DRIVER,
            account_id=old_driver.driver_account_id,
        )
        DriverAccountLink.objects.create(
            driver_account=old_driver,
            driver_id="50000000-0000-0000-0000-000000000001",
        )
        request = self._create_request(
            identity=request_identity,
            company_id=self.other_company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        request.is_re_request = True
        request.from_company_id = self.company_id
        request.save(update_fields=["is_re_request", "from_company_id"])
        self._login_identity("sys-rerequest@example.com", "sys-rerequest-pass-123")

        approve_response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/approve/",
            format="json",
        )

        self.assertEqual(approve_response.status_code, 200)
        request.refresh_from_db()
        self.assertEqual(request.status, IdentitySignupRequest.Status.AWAITING_SETUP)

        old_manager.refresh_from_db()
        old_driver.refresh_from_db()
        self.assertEqual(old_manager.status, ManagerAccount.Status.ARCHIVED)
        self.assertEqual(old_driver.status, DriverAccount.Status.ARCHIVED)

        manager_link = IdentityAccountLink.objects.get(
            identity=request_identity,
            account_type=IdentityAccountLink.AccountType.MANAGER,
            account_id=old_manager.manager_account_id,
        )
        driver_identity_link = IdentityAccountLink.objects.get(
            identity=request_identity,
            account_type=IdentityAccountLink.AccountType.DRIVER,
            account_id=old_driver.driver_account_id,
        )
        self.assertIsNotNone(manager_link.unlinked_at)
        self.assertIsNotNone(driver_identity_link.unlinked_at)

        old_driver_link = DriverAccountLink.objects.get(driver_account=old_driver)
        self.assertIsNotNone(old_driver_link.unlinked_at)
        self.assertEqual(old_driver_link.unlink_reason, "company_changed")

        new_driver = DriverAccount.objects.get(identity=request_identity, status=DriverAccount.Status.ACTIVE)
        self.assertEqual(str(new_driver.company_id), self.other_company_id)
        self.assertFalse(
            ManagerAccount.objects.filter(identity=request_identity, status=ManagerAccount.Status.ACTIVE).exists()
        )

    def test_company_change_approval_invalidates_old_manager_session(self):
        system_identity = self._create_identity_with_password(
            name="시스템 관리자",
            birth_date="1980-01-01",
            email="sys-session-cut@example.com",
            password="sys-session-cut-pass-123",
        )
        SystemAdminAccount.objects.create(identity=system_identity)
        request_identity = self._create_identity_with_password(
            name="세션 종료 사용자",
            birth_date="1990-01-02",
            email="session-cut@example.com",
            password="session-cut-pass-123",
        )
        manager_account = ManagerAccount.objects.create(
            identity=request_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        IdentityAccountLink.objects.create(
            identity=request_identity,
            account_type=IdentityAccountLink.AccountType.MANAGER,
            account_id=manager_account.manager_account_id,
        )
        request = self._create_request(
            identity=request_identity,
            company_id=self.other_company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        request.is_re_request = True
        request.from_company_id = self.company_id
        request.save(update_fields=["is_re_request", "from_company_id"])

        requester_client = APIClient()
        login_response = requester_client.post(
            "/identity-login/",
            {"email": "session-cut@example.com", "password": "session-cut-pass-123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        requester_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access_token']}")
        requester_client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        admin_client = APIClient()
        admin_login_response = admin_client.post(
            "/identity-login/",
            {"email": "sys-session-cut@example.com", "password": "sys-session-cut-pass-123"},
            format="json",
        )
        self.assertEqual(admin_login_response.status_code, 200)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login_response.data['access_token']}")
        approve_response = admin_client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/approve/",
            format="json",
        )
        self.assertEqual(approve_response.status_code, 200)

        me_response = requester_client.get("/identity-me/")
        refresh_response = requester_client.post("/identity-refresh/")

        self.assertIn(me_response.status_code, {401, 403})
        self.assertIn(refresh_response.status_code, {401, 403})

    def test_system_admin_can_list_all_requests_and_approve_driver_request(self):
        system_identity = self._create_identity_with_password(
            name="시스템 관리자",
            birth_date="1980-01-01",
            email="sys@example.com",
            password="sys-pass-123",
        )
        SystemAdminAccount.objects.create(identity=system_identity)

        request_identity = self._create_identity_with_password(
            name="배송원 신청자",
            birth_date="1993-03-03",
            email="driver-request@example.com",
            password="driver-pass-123",
        )
        request = self._create_request(
            identity=request_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
        )
        self._login_identity("sys@example.com", "sys-pass-123")

        list_response = self.client.get("/identity-signup-requests/manage/")
        approve_response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/approve/",
            format="json",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data["requests"]), 1)
        self.assertEqual(approve_response.status_code, 200)

        request.refresh_from_db()
        self.assertEqual(request.status, IdentitySignupRequest.Status.APPROVED)
        driver_account = DriverAccount.objects.get(identity=request_identity, status=DriverAccount.Status.ACTIVE)
        self.assertEqual(str(driver_account.company_id), self.company_id)
        self.assertTrue(
            IdentityAccountLink.objects.filter(
                identity=request_identity,
                account_type=IdentityAccountLink.AccountType.DRIVER,
                account_id=driver_account.driver_account_id,
            ).exists()
        )

    def test_company_super_admin_can_only_see_same_company_requests(self):
        super_admin_identity = self._create_identity_with_password(
            name="회사 총괄",
            birth_date="1985-05-05",
            email="company-admin@example.com",
            password="company-pass-123",
        )
        ManagerAccount.objects.create(
            identity=super_admin_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

        own_request_identity = self._create_identity_with_password(
            name="같은 회사 요청자",
            birth_date="1991-01-01",
            email="same-company@example.com",
            password="same-pass-123",
        )
        other_request_identity = self._create_identity_with_password(
            name="다른 회사 요청자",
            birth_date="1991-01-02",
            email="other-company@example.com",
            password="other-pass-123",
        )
        own_request = self._create_request(
            identity=own_request_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
        )
        self._create_request(
            identity=other_request_identity,
            company_id=self.other_company_id,
            request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
        )
        self._login_identity("company-admin@example.com", "company-pass-123")

        response = self.client.get("/identity-signup-requests/manage/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["identity_signup_request_id"] for item in response.data["requests"]],
            [str(own_request.identity_signup_request_id)],
        )

    def test_fleet_manager_can_only_see_same_company_driver_requests(self):
        fleet_manager_identity = self._create_identity_with_password(
            name="플릿 관리자",
            birth_date="1986-06-06",
            email="fleet-manager@example.com",
            password="fleet-manager-pass-123",
        )
        ManagerAccount.objects.create(
            identity=fleet_manager_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.FLEET_MANAGER,
        )

        own_driver_identity = self._create_identity_with_password(
            name="같은 회사 배송원 요청자",
            birth_date="1991-01-01",
            email="fleet-driver-own@example.com",
            password="fleet-driver-own-pass-123",
        )
        own_manager_identity = self._create_identity_with_password(
            name="같은 회사 관리자 요청자",
            birth_date="1991-01-02",
            email="fleet-manager-own@example.com",
            password="fleet-manager-own-pass-123",
        )
        other_driver_identity = self._create_identity_with_password(
            name="다른 회사 배송원 요청자",
            birth_date="1991-01-03",
            email="fleet-driver-other@example.com",
            password="fleet-driver-other-pass-123",
        )
        own_request = self._create_request(
            identity=own_driver_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
        )
        self._create_request(
            identity=own_manager_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        self._create_request(
            identity=other_driver_identity,
            company_id=self.other_company_id,
            request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
        )

        self._login_identity("fleet-manager@example.com", "fleet-manager-pass-123")
        response = self.client.get("/identity-signup-requests/manage/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["identity_signup_request_id"] for item in response.data["requests"]],
            [str(own_request.identity_signup_request_id)],
        )

    def test_company_super_admin_approves_manager_request_into_awaiting_setup_then_completes_setup(self):
        super_admin_identity = self._create_identity_with_password(
            name="회사 총괄",
            birth_date="1985-05-05",
            email="manager-admin@example.com",
            password="manager-admin-pass-123",
        )
        super_admin_account = ManagerAccount.objects.create(
            identity=super_admin_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

        request_identity = self._create_identity_with_password(
            name="매니저 신청자",
            birth_date="1994-04-04",
            email="manager-request@example.com",
            password="manager-request-pass-123",
        )
        request = IdentitySignupRequest.objects.create(
            identity=request_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        self._login_identity("manager-admin@example.com", "manager-admin-pass-123")

        approve_response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/approve/",
            format="json",
        )

        self.assertEqual(approve_response.status_code, 200)
        request.refresh_from_db()
        self.assertEqual(request.status, IdentitySignupRequest.Status.AWAITING_SETUP)

        setup_response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/complete-setup/",
            {"role_type": ManagerAccount.RoleType.VEHICLE_MANAGER},
            format="json",
        )

        self.assertEqual(setup_response.status_code, 200)
        request.refresh_from_db()
        self.assertEqual(request.status, IdentitySignupRequest.Status.APPROVED)
        created_manager = ManagerAccount.objects.get(
            identity=request_identity,
            status=ManagerAccount.Status.ACTIVE,
        )
        self.assertEqual(created_manager.role_type, ManagerAccount.RoleType.VEHICLE_MANAGER)
        self.assertEqual(str(created_manager.company_id), self.company_id)
        self.assertNotEqual(created_manager.manager_account_id, super_admin_account.manager_account_id)

    def test_vehicle_manager_can_reject_driver_request_but_cannot_approve_manager_request(self):
        vehicle_manager_identity = self._create_identity_with_password(
            name="차량 관리자",
            birth_date="1987-07-07",
            email="vehicle-manager@example.com",
            password="vehicle-pass-123",
        )
        ManagerAccount.objects.create(
            identity=vehicle_manager_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        driver_request_identity = self._create_identity_with_password(
            name="배송원 요청자",
            birth_date="1995-05-05",
            email="driver-only@example.com",
            password="driver-only-pass-123",
        )
        manager_request_identity = self._create_identity_with_password(
            name="매니저 요청자",
            birth_date="1996-06-06",
            email="manager-only@example.com",
            password="manager-only-pass-123",
        )
        driver_request = self._create_request(
            identity=driver_request_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
        )
        manager_request = self._create_request(
            identity=manager_request_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
        )
        self._login_identity("vehicle-manager@example.com", "vehicle-pass-123")

        reject_response = self.client.post(
            f"/identity-signup-requests/{driver_request.identity_signup_request_id}/reject/",
            {"reject_reason": "admin_rejected"},
            format="json",
        )
        approve_manager_response = self.client.post(
            f"/identity-signup-requests/{manager_request.identity_signup_request_id}/approve/",
            format="json",
        )

        self.assertEqual(reject_response.status_code, 200)
        driver_request.refresh_from_db()
        self.assertEqual(driver_request.status, IdentitySignupRequest.Status.REJECTED)
        self.assertEqual(driver_request.reject_reason, "admin_rejected")

        self.assertEqual(approve_manager_response.status_code, 403)


class ManagerAccountManagementApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()
        self.company_id = "30000000-0000-0000-0000-000000000001"
        self.other_company_id = "30000000-0000-0000-0000-000000000002"

    def _create_identity_with_password(
        self,
        *,
        name: str,
        birth_date: str,
        email: str,
        password: str,
    ) -> Identity:
        identity = Identity.objects.create(name=name, birth_date=birth_date)
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
        return identity

    def _login_identity(self, email: str, password: str):
        response = self.client.post(
            "/identity-login/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")
        return response

    def _create_manager_account(
        self,
        *,
        identity: Identity,
        company_id: str,
        role_type: str,
        status: str = ManagerAccount.Status.ACTIVE,
    ) -> ManagerAccount:
        manager_account = ManagerAccount.objects.create(
            identity=identity,
            company_id=company_id,
            role_type=role_type,
            status=status,
        )
        IdentityAccountLink.objects.create(
            identity=identity,
            account_type=IdentityAccountLink.AccountType.MANAGER,
            account_id=manager_account.manager_account_id,
        )
        return manager_account

    def test_system_admin_can_list_all_active_manager_accounts(self):
        system_identity = self._create_identity_with_password(
            name="시스템 관리자",
            birth_date="1980-01-01",
            email="sys-manage@example.com",
            password="sys-pass-123",
        )
        SystemAdminAccount.objects.create(identity=system_identity)
        first_identity = self._create_identity_with_password(
            name="총괄 관리자",
            birth_date="1985-05-05",
            email="company-super@example.com",
            password="company-super-pass-123",
        )
        second_identity = self._create_identity_with_password(
            name="차량 관리자",
            birth_date="1990-01-02",
            email="vehicle-manage@example.com",
            password="vehicle-manage-pass-123",
        )
        archived_identity = self._create_identity_with_password(
            name="보관 관리자",
            birth_date="1988-08-08",
            email="archived-manage@example.com",
            password="archived-manage-pass-123",
        )
        first_manager = self._create_manager_account(
            identity=first_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        second_manager = self._create_manager_account(
            identity=second_identity,
            company_id=self.other_company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        self._create_manager_account(
            identity=archived_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.SETTLEMENT_MANAGER,
            status=ManagerAccount.Status.ARCHIVED,
        )

        self._login_identity("sys-manage@example.com", "sys-pass-123")
        response = self.client.get("/manager-accounts/manage/")

        self.assertEqual(response.status_code, 200)
        returned_ids = {row["manager_account_id"] for row in response.data["accounts"]}
        self.assertEqual(
            returned_ids,
            {
                str(first_manager.manager_account_id),
                str(second_manager.manager_account_id),
            },
        )

    def test_company_super_admin_lists_self_and_lower_managers_only(self):
        super_identity = self._create_identity_with_password(
            name="회사 총괄 A",
            birth_date="1980-01-01",
            email="company-super-a@example.com",
            password="company-super-a-pass-123",
        )
        peer_super_identity = self._create_identity_with_password(
            name="회사 총괄 B",
            birth_date="1981-01-01",
            email="company-super-b@example.com",
            password="company-super-b-pass-123",
        )
        vehicle_identity = self._create_identity_with_password(
            name="차량 관리자",
            birth_date="1990-01-02",
            email="company-vehicle@example.com",
            password="company-vehicle-pass-123",
        )
        settlement_identity = self._create_identity_with_password(
            name="정산 관리자",
            birth_date="1991-01-02",
            email="company-settlement@example.com",
            password="company-settlement-pass-123",
        )
        other_identity = self._create_identity_with_password(
            name="타사 관리자",
            birth_date="1992-01-02",
            email="other-company-manager@example.com",
            password="other-company-manager-pass-123",
        )
        super_account = self._create_manager_account(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        peer_super_account = self._create_manager_account(
            identity=peer_super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        vehicle_account = self._create_manager_account(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        settlement_account = self._create_manager_account(
            identity=settlement_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.SETTLEMENT_MANAGER,
        )
        fleet_identity = self._create_identity_with_password(
            name="플릿 관리자",
            birth_date="1993-01-02",
            email="company-fleet@example.com",
            password="company-fleet-pass-123",
        )
        fleet_account = self._create_manager_account(
            identity=fleet_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.FLEET_MANAGER,
        )
        self._create_manager_account(
            identity=other_identity,
            company_id=self.other_company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self._login_identity("company-super-a@example.com", "company-super-a-pass-123")
        response = self.client.get("/manager-accounts/manage/")

        self.assertEqual(response.status_code, 200)
        returned_ids = {row["manager_account_id"] for row in response.data["accounts"]}
        self.assertEqual(
            returned_ids,
            {
                str(super_account.manager_account_id),
                str(vehicle_account.manager_account_id),
                str(settlement_account.manager_account_id),
                str(fleet_account.manager_account_id),
            },
        )
        self.assertNotIn(str(peer_super_account.manager_account_id), returned_ids)

    def test_company_super_admin_lists_same_company_custom_manager_accounts(self):
        super_identity = self._create_identity_with_password(
            name="커스텀 역할 총괄",
            birth_date="1980-01-01",
            email="custom-list-super@example.com",
            password="custom-list-super-pass-123",
        )
        custom_identity = self._create_identity_with_password(
            name="커스텀 역할 담당자",
            birth_date="1992-01-02",
            email="custom-list-target@example.com",
            password="custom-list-target-pass-123",
        )
        self._create_manager_account(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        CompanyManagerRole.objects.create(
            company_id=self.company_id,
            code="dispatch_specialist",
            display_name="배차 전문 관리자",
            is_system_required=False,
            is_default=False,
            allowed_nav_keys=["dashboard", "dispatch"],
        )
        custom_account = self._create_manager_account(
            identity=custom_identity,
            company_id=self.company_id,
            role_type="dispatch_specialist",
        )

        self._login_identity("custom-list-super@example.com", "custom-list-super-pass-123")
        response = self.client.get("/manager-accounts/manage/")

        self.assertEqual(response.status_code, 200)
        returned_ids = {row["manager_account_id"] for row in response.data["accounts"]}
        self.assertIn(str(custom_account.manager_account_id), returned_ids)

    def test_vehicle_manager_lists_only_self(self):
        vehicle_identity = self._create_identity_with_password(
            name="차량 관리자",
            birth_date="1990-01-02",
            email="list-self@example.com",
            password="list-self-pass-123",
        )
        other_identity = self._create_identity_with_password(
            name="정산 관리자",
            birth_date="1991-01-02",
            email="list-other@example.com",
            password="list-other-pass-123",
        )
        vehicle_account = self._create_manager_account(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        self._create_manager_account(
            identity=other_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.SETTLEMENT_MANAGER,
        )

        self._login_identity("list-self@example.com", "list-self-pass-123")
        response = self.client.get("/manager-accounts/manage/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["accounts"]), 1)
        self.assertEqual(response.data["accounts"][0]["manager_account_id"], str(vehicle_account.manager_account_id))

    def test_vehicle_manager_without_accounts_nav_key_cannot_list_manager_accounts(self):
        vehicle_identity = self._create_identity_with_password(
            name="권한 차단 차량 관리자",
            birth_date="1990-01-02",
            email="nav-block-manager@example.com",
            password="nav-block-pass-123",
        )
        self._create_manager_account(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        CompanyManagerRole.objects.create(
            company_id=self.company_id,
            code=ManagerAccount.RoleType.VEHICLE_MANAGER,
            display_name="차량 관리자",
            is_system_required=False,
            is_default=True,
            allowed_nav_keys=["dashboard", "vehicles"],
        )

        self._login_identity("nav-block-manager@example.com", "nav-block-pass-123")
        response = self.client.get("/manager-accounts/manage/")

        self.assertEqual(response.status_code, 403)

    def test_company_super_admin_can_change_lower_manager_role_in_place(self):
        super_identity = self._create_identity_with_password(
            name="역할 전환 총괄",
            birth_date="1980-01-01",
            email="change-role-super@example.com",
            password="change-role-super-pass-123",
        )
        lower_identity = self._create_identity_with_password(
            name="역할 전환 대상",
            birth_date="1990-01-02",
            email="change-role-target@example.com",
            password="change-role-target-pass-123",
        )
        self._create_manager_account(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        lower_account = self._create_manager_account(
            identity=lower_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self._login_identity("change-role-super@example.com", "change-role-super-pass-123")
        response = self.client.post(
            f"/manager-accounts/{lower_account.manager_account_id}/change-role/",
            {"role_type": ManagerAccount.RoleType.FLEET_MANAGER},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        lower_account.refresh_from_db()
        self.assertEqual(lower_account.role_type, ManagerAccount.RoleType.FLEET_MANAGER)
        self.assertEqual(response.data["manager_account_id"], str(lower_account.manager_account_id))

    def test_company_super_admin_can_change_manager_role_to_custom_company_role(self):
        super_identity = self._create_identity_with_password(
            name="커스텀 전환 총괄",
            birth_date="1980-01-01",
            email="custom-change-super@example.com",
            password="custom-change-super-pass-123",
        )
        target_identity = self._create_identity_with_password(
            name="커스텀 전환 대상",
            birth_date="1990-01-02",
            email="custom-change-target@example.com",
            password="custom-change-target-pass-123",
        )
        self._create_manager_account(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        CompanyManagerRole.objects.create(
            company_id=self.company_id,
            code="safety_manager",
            display_name="안전 관리자",
            is_system_required=False,
            is_default=False,
            allowed_nav_keys=["dashboard", "vehicles"],
        )
        target_account = self._create_manager_account(
            identity=target_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self._login_identity("custom-change-super@example.com", "custom-change-super-pass-123")
        response = self.client.post(
            f"/manager-accounts/{target_account.manager_account_id}/change-role/",
            {"role_type": "safety_manager"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        target_account.refresh_from_db()
        self.assertEqual(target_account.role_type, "safety_manager")
        self.assertEqual(response.data["role_type"], "safety_manager")

    def test_company_super_admin_can_approve_manager_request_with_custom_company_role(self):
        super_identity = self._create_identity_with_password(
            name="커스텀 승인 총괄",
            birth_date="1980-01-01",
            email="custom-approve-super@example.com",
            password="custom-approve-super-pass-123",
        )
        request_identity = self._create_identity_with_password(
            name="커스텀 승인 신청자",
            birth_date="1990-01-02",
            email="custom-approve-target@example.com",
            password="custom-approve-target-pass-123",
        )
        self._create_manager_account(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        CompanyManagerRole.objects.create(
            company_id=self.company_id,
            code="dispatch_coordinator",
            display_name="배차 조정 관리자",
            is_system_required=False,
            is_default=False,
            allowed_nav_keys=["dashboard", "dispatch"],
        )
        request = IdentitySignupRequest.objects.create(
            identity=request_identity,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
            company_id=self.company_id,
            status=IdentitySignupRequest.Status.PENDING,
        )

        self._login_identity("custom-approve-super@example.com", "custom-approve-super-pass-123")
        response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/approve/",
            {"role_type": "dispatch_coordinator"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        manager_account = ManagerAccount.objects.get(identity=request_identity, status=ManagerAccount.Status.ACTIVE)
        self.assertEqual(manager_account.role_type, "dispatch_coordinator")

    def test_company_super_admin_can_complete_manager_setup_as_fleet_manager(self):
        super_identity = self._create_identity_with_password(
            name="플릿 역할 부여 총괄",
            birth_date="1980-01-01",
            email="setup-fleet-super@example.com",
            password="setup-fleet-super-pass-123",
        )
        request_identity = self._create_identity_with_password(
            name="플릿 역할 신청자",
            birth_date="1990-01-02",
            email="setup-fleet-target@example.com",
            password="setup-fleet-target-pass-123",
        )
        self._create_manager_account(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        request = IdentitySignupRequest.objects.create(
            identity=request_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
            status=IdentitySignupRequest.Status.PENDING,
        )
        request.status = IdentitySignupRequest.Status.AWAITING_SETUP
        request.save(update_fields=["status"])

        self._login_identity("setup-fleet-super@example.com", "setup-fleet-super-pass-123")
        response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/complete-setup/",
            {"role_type": ManagerAccount.RoleType.FLEET_MANAGER},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        created_manager = ManagerAccount.objects.get(
            identity=request_identity,
            status=ManagerAccount.Status.ACTIVE,
        )
        self.assertEqual(created_manager.role_type, ManagerAccount.RoleType.FLEET_MANAGER)

    def test_vehicle_manager_cannot_change_own_role(self):
        vehicle_identity = self._create_identity_with_password(
            name="자기 역할 변경 불가",
            birth_date="1990-01-02",
            email="self-role-change@example.com",
            password="self-role-change-pass-123",
        )
        vehicle_account = self._create_manager_account(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self._login_identity("self-role-change@example.com", "self-role-change-pass-123")
        response = self.client.post(
            f"/manager-accounts/{vehicle_account.manager_account_id}/change-role/",
            {"role_type": ManagerAccount.RoleType.SETTLEMENT_MANAGER},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_vehicle_manager_can_archive_self_and_close_active_identity_link(self):
        vehicle_identity = self._create_identity_with_password(
            name="자기 아카이브",
            birth_date="1990-01-02",
            email="self-archive@example.com",
            password="self-archive-pass-123",
        )
        vehicle_account = self._create_manager_account(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self._login_identity("self-archive@example.com", "self-archive-pass-123")
        response = self.client.post(
            f"/manager-accounts/{vehicle_account.manager_account_id}/archive/",
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        vehicle_account.refresh_from_db()
        self.assertEqual(vehicle_account.status, ManagerAccount.Status.ARCHIVED)
        link = IdentityAccountLink.objects.get(
            identity=vehicle_identity,
            account_type=IdentityAccountLink.AccountType.MANAGER,
            account_id=vehicle_account.manager_account_id,
        )
        self.assertIsNotNone(link.unlinked_at)

    def test_company_super_admin_cannot_archive_peer_company_super_admin(self):
        super_identity = self._create_identity_with_password(
            name="총괄 A",
            birth_date="1980-01-01",
            email="archive-super-a@example.com",
            password="archive-super-a-pass-123",
        )
        peer_identity = self._create_identity_with_password(
            name="총괄 B",
            birth_date="1981-01-01",
            email="archive-super-b@example.com",
            password="archive-super-b-pass-123",
        )
        self._create_manager_account(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        peer_account = self._create_manager_account(
            identity=peer_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

        self._login_identity("archive-super-a@example.com", "archive-super-a-pass-123")
        response = self.client.post(
            f"/manager-accounts/{peer_account.manager_account_id}/archive/",
            format="json",
        )

        self.assertEqual(response.status_code, 403)


class DriverAccountManagementApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()
        self.company_id = "30000000-0000-0000-0000-000000000001"
        self.other_company_id = "30000000-0000-0000-0000-000000000002"

    def _create_identity_with_password(
        self,
        *,
        name: str,
        birth_date: str,
        email: str,
        password: str,
    ) -> Identity:
        identity = Identity.objects.create(name=name, birth_date=birth_date)
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
        return identity

    def _login_identity(self, email: str, password: str):
        response = self.client.post(
            "/identity-login/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")
        return response

    def _create_driver_account(
        self,
        *,
        identity: Identity,
        company_id: str,
        status: str = DriverAccount.Status.ACTIVE,
    ) -> DriverAccount:
        driver_account = DriverAccount.objects.create(
            identity=identity,
            company_id=company_id,
            status=status,
        )
        IdentityAccountLink.objects.create(
            identity=identity,
            account_type=IdentityAccountLink.AccountType.DRIVER,
            account_id=driver_account.driver_account_id,
        )
        return driver_account

    def test_company_super_admin_can_list_same_company_driver_accounts(self):
        super_identity = self._create_identity_with_password(
            name="회사 총괄",
            birth_date="1980-01-01",
            email="driver-list-super@example.com",
            password="driver-list-super-pass-123",
        )
        ManagerAccount.objects.create(
            identity=super_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        own_identity = self._create_identity_with_password(
            name="같은 회사 배송원 계정",
            birth_date="1990-01-02",
            email="same-driver-account@example.com",
            password="same-driver-account-pass-123",
        )
        other_identity = self._create_identity_with_password(
            name="다른 회사 배송원 계정",
            birth_date="1991-01-02",
            email="other-driver-account@example.com",
            password="other-driver-account-pass-123",
        )
        own_driver_account = self._create_driver_account(
            identity=own_identity,
            company_id=self.company_id,
        )
        self._create_driver_account(
            identity=other_identity,
            company_id=self.other_company_id,
        )

        self._login_identity("driver-list-super@example.com", "driver-list-super-pass-123")
        response = self.client.get("/driver-accounts/manage/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["accounts"]), 1)
        self.assertEqual(response.data["accounts"][0]["driver_account_id"], str(own_driver_account.driver_account_id))

    def test_vehicle_manager_without_accounts_nav_key_cannot_list_driver_accounts(self):
        vehicle_identity = self._create_identity_with_password(
            name="권한 차단 차량 관리자 B",
            birth_date="1990-01-02",
            email="nav-block-driver@example.com",
            password="nav-block-driver-pass-123",
        )
        ManagerAccount.objects.create(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        CompanyManagerRole.objects.create(
            company_id=self.company_id,
            code=ManagerAccount.RoleType.VEHICLE_MANAGER,
            display_name="차량 관리자",
            is_system_required=False,
            is_default=True,
            allowed_nav_keys=["dashboard", "vehicles"],
        )

        self._login_identity("nav-block-driver@example.com", "nav-block-driver-pass-123")
        response = self.client.get("/driver-accounts/manage/")

        self.assertEqual(response.status_code, 403)

    @patch("accounts.services.driver_account_link_service.DriverProfileCompanyLookupClient.get_driver_company_id")
    def test_vehicle_manager_can_link_driver_account_to_driver(self, get_driver_company_id):
        get_driver_company_id.return_value = self.company_id
        vehicle_identity = self._create_identity_with_password(
            name="차량 관리자",
            birth_date="1990-01-02",
            email="driver-link-vehicle@example.com",
            password="driver-link-vehicle-pass-123",
        )
        ManagerAccount.objects.create(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        driver_identity = self._create_identity_with_password(
            name="배송원 계정",
            birth_date="1991-01-02",
            email="driver-link-target@example.com",
            password="driver-link-target-pass-123",
        )
        driver_account = self._create_driver_account(
            identity=driver_identity,
            company_id=self.company_id,
        )

        self._login_identity("driver-link-vehicle@example.com", "driver-link-vehicle-pass-123")
        response = self.client.post(
            "/driver-account-links/",
            {
                "driver_account_id": str(driver_account.driver_account_id),
                "driver_id": "50000000-0000-0000-0000-000000000001",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        link = DriverAccountLink.objects.get(driver_account=driver_account, unlinked_at__isnull=True)
        self.assertEqual(str(link.driver_id), "50000000-0000-0000-0000-000000000001")

    @patch("accounts.services.driver_account_link_service.DriverProfileCompanyLookupClient.get_driver_company_id")
    def test_link_rejects_company_mismatch(self, get_driver_company_id):
        get_driver_company_id.return_value = self.other_company_id
        vehicle_identity = self._create_identity_with_password(
            name="차량 관리자",
            birth_date="1990-01-02",
            email="driver-link-mismatch@example.com",
            password="driver-link-mismatch-pass-123",
        )
        ManagerAccount.objects.create(
            identity=vehicle_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        driver_identity = self._create_identity_with_password(
            name="배송원 계정",
            birth_date="1991-01-02",
            email="driver-link-mismatch-target@example.com",
            password="driver-link-mismatch-target-pass-123",
        )
        driver_account = self._create_driver_account(identity=driver_identity, company_id=self.company_id)

        self._login_identity("driver-link-mismatch@example.com", "driver-link-mismatch-pass-123")
        response = self.client.post(
            "/driver-account-links/",
            {
                "driver_account_id": str(driver_account.driver_account_id),
                "driver_id": "50000000-0000-0000-0000-000000000001",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("driver_id", response.data["details"])

    @patch("accounts.services.driver_account_link_service.DriverProfileCompanyLookupClient.get_driver_company_id")
    def test_settlement_manager_can_unlink_driver_account(self, get_driver_company_id):
        get_driver_company_id.return_value = self.company_id
        settlement_identity = self._create_identity_with_password(
            name="정산 관리자",
            birth_date="1990-01-02",
            email="driver-unlink-settlement@example.com",
            password="driver-unlink-settlement-pass-123",
        )
        ManagerAccount.objects.create(
            identity=settlement_identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.SETTLEMENT_MANAGER,
        )
        driver_identity = self._create_identity_with_password(
            name="배송원 계정",
            birth_date="1991-01-02",
            email="driver-unlink-target@example.com",
            password="driver-unlink-target-pass-123",
        )
        driver_account = self._create_driver_account(identity=driver_identity, company_id=self.company_id)
        link = DriverAccountLink.objects.create(
            driver_account=driver_account,
            driver_id="50000000-0000-0000-0000-000000000001",
        )

        self._login_identity("driver-unlink-settlement@example.com", "driver-unlink-settlement-pass-123")
        response = self.client.post(
            f"/driver-account-links/{link.driver_account_link_id}/unlink/",
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        link.refresh_from_db()
        self.assertIsNotNone(link.unlinked_at)
        self.assertEqual(link.unlink_reason, "admin_unlinked")


class IdentityProfileApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()

    def _create_identity_with_password(
        self,
        *,
        name: str,
        birth_date: str,
        email: str,
        password: str,
    ) -> Identity:
        identity = Identity.objects.create(name=name, birth_date=birth_date)
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
            privacy_policy_consented_at=now,
            location_policy_version="v1.0",
            location_policy_consented_at=now,
        )
        return identity

    def _login_identity(self, email: str, password: str):
        response = self.client.post(
            "/identity-login/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")
        return response

    def test_identity_user_can_read_and_update_own_profile(self):
        identity = self._create_identity_with_password(
            name="프로필 사용자",
            birth_date="1990-01-02",
            email="profile@example.com",
            password="profile-pass-123",
        )
        self._login_identity("profile@example.com", "profile-pass-123")

        get_response = self.client.get("/identity-profile/")
        patch_response = self.client.patch(
            "/identity-profile/",
            {"name": "수정된 사용자", "birth_date": "1991-02-03"},
            format="json",
        )

        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["name"], "프로필 사용자")
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["name"], "수정된 사용자")
        self.assertEqual(patch_response.data["birth_date"], "1991-02-03")

        identity.refresh_from_db()
        self.assertEqual(identity.name, "수정된 사용자")
        self.assertEqual(str(identity.birth_date), "1991-02-03")
        self.assertTrue(
            identity.profile_history.filter(name="수정된 사용자", birth_date="1991-02-03").exists()
        )


class IdentityFinalCutoverApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()
        self.company_id = "30000000-0000-0000-0000-000000000001"

    def _create_identity_with_password(
        self,
        *,
        name: str,
        birth_date: str,
        email: str,
        password: str,
    ) -> Identity:
        identity = Identity.objects.create(name=name, birth_date=birth_date)
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
        return identity

    def _provision_vehicle_manager(self, *, email: str, password: str) -> tuple[Identity, ManagerAccount]:
        approver = self._create_identity_with_password(
            name="회사 총괄",
            birth_date="1985-05-05",
            email="company-admin@example.com",
            password="company-pass-123",
        )
        ManagerAccount.objects.create(
            identity=approver,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        identity = self._create_identity_with_password(
            name="최종 전환 사용자",
            birth_date="1990-01-02",
            email=email,
            password=password,
        )
        request = IdentitySignupRequest.objects.create(
            identity=identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
            status=IdentitySignupRequest.Status.PENDING,
        )
        approve = self.client.post(
            "/identity-login/",
            {"email": "company-admin@example.com", "password": "company-pass-123"},
            format="json",
        )
        self.assertEqual(approve.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {approve.data['access_token']}")
        self.client.post(f"/identity-signup-requests/{request.identity_signup_request_id}/approve/", format="json")
        self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/complete-setup/",
            {"role_type": ManagerAccount.RoleType.VEHICLE_MANAGER},
            format="json",
        )
        self.client.credentials()
        self.client.cookies.clear()
        manager_account = ManagerAccount.objects.get(identity=identity, status=ManagerAccount.Status.ACTIVE)
        return identity, manager_account

    def test_identity_login_returns_final_session_shape_and_account_claims(self):
        identity, manager_account = self._provision_vehicle_manager(
            email="final-contract@example.com",
            password="final-contract-pass-123",
        )

        response = self.client.post(
            "/identity-login/",
            {"email": "final-contract@example.com", "password": "final-contract-pass-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "final-contract@example.com")
        self.assertEqual(response.data["identity"]["identity_id"], str(identity.identity_id))
        self.assertEqual(response.data["active_account"]["account_type"], "manager")
        self.assertEqual(response.data["active_account"]["account_id"], str(manager_account.manager_account_id))
        self.assertEqual(response.data["active_account"]["company_id"], self.company_id)
        self.assertEqual(response.data["active_account"]["role_type"], ManagerAccount.RoleType.VEHICLE_MANAGER)

        payload = decode_token(response.data["access_token"], "access")
        self.assertEqual(payload["sub"], str(manager_account.manager_account_id))
        self.assertEqual(payload["identity_id"], str(identity.identity_id))
        self.assertEqual(payload["active_account_id"], str(manager_account.manager_account_id))
        self.assertEqual(payload["active_account_type"], "manager")
        self.assertEqual(payload["company_id"], self.company_id)
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["role_type"], ManagerAccount.RoleType.VEHICLE_MANAGER)
        self.assertEqual(payload["email"], "final-contract@example.com")
        self.assertEqual(
            payload["allowed_nav_keys"],
            [
                "dashboard",
                "account",
                "accounts",
                "announcements",
                "support",
                "notifications",
                "regions",
                "vehicles",
                "vehicle_assignments",
                "drivers",
                "personnel_documents",
            ],
        )
        self.assertEqual(payload["navigation_policy_source"], "default")

    def test_identity_refresh_keeps_final_session_shape(self):
        self._provision_vehicle_manager(
            email="refresh-final@example.com",
            password="refresh-final-pass-123",
        )
        login_response = self.client.post(
            "/identity-login/",
            {"email": "refresh-final@example.com", "password": "refresh-final-pass-123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        self.client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        refresh_response = self.client.post("/identity-refresh/")

        self.assertEqual(refresh_response.status_code, 200)
        self.assertEqual(refresh_response.data["email"], "refresh-final@example.com")
        self.assertEqual(refresh_response.data["active_account"]["account_type"], "manager")
        self.assertIn("access_token", refresh_response.data)
        payload = decode_token(refresh_response.data["access_token"], "access")
        self.assertIn("allowed_nav_keys", payload)
        self.assertEqual(payload["navigation_policy_source"], "default")

    def test_identity_me_returns_current_identity_session_shape(self):
        identity, manager_account = self._provision_vehicle_manager(
            email="me-final@example.com",
            password="me-final-pass-123",
        )
        login_response = self.client.post(
            "/identity-login/",
            {"email": "me-final@example.com", "password": "me-final-pass-123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access_token']}")

        me_response = self.client.get("/identity-me/")

        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.data["access_token"], "")
        self.assertEqual(me_response.data["email"], "me-final@example.com")
        self.assertEqual(me_response.data["identity"]["identity_id"], str(identity.identity_id))
        self.assertEqual(me_response.data["active_account"]["account_type"], "manager")
        self.assertEqual(me_response.data["active_account"]["account_id"], str(manager_account.manager_account_id))

    def test_identity_logout_clears_refresh_cookie_and_invalidates_refresh_token(self):
        self._provision_vehicle_manager(
            email="logout-final@example.com",
            password="logout-final-pass-123",
        )
        login_response = self.client.post(
            "/identity-login/",
            {"email": "logout-final@example.com", "password": "logout-final-pass-123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        refresh_token = login_response.cookies["refresh_token"].value
        self.client.cookies["refresh_token"] = refresh_token

        logout_response = self.client.post("/identity-logout/")

        self.assertEqual(logout_response.status_code, 204)
        self.assertFalse(RefreshRegistry().is_registered(refresh_token))

        refresh_response = self.client.post("/identity-refresh/")
        self.assertEqual(refresh_response.status_code, 403)

    def test_legacy_auth_surface_is_removed(self):
        response_login = self.client.post(
            "/login/",
            {"email": "legacy@example.com", "password": "legacy-pass-123"},
            format="json",
        )
        response_refresh = self.client.post("/refresh/")
        response_accounts = self.client.get("/accounts/")

        self.assertEqual(response_login.status_code, 404)
        self.assertEqual(response_refresh.status_code, 404)
        self.assertEqual(response_accounts.status_code, 404)

    def test_driver_account_link_list_can_filter_by_driver_id(self):
        linked_identity = self._create_identity_with_password(
            name="배송원 계정 사용자",
            birth_date="1991-01-01",
            email="driver-link@example.com",
            password="driver-link-pass-123",
        )
        driver_account = DriverAccount.objects.create(
            identity=linked_identity,
            company_id=self.company_id,
            status=DriverAccount.Status.ACTIVE,
        )
        driver_id = "50000000-0000-0000-0000-000000000001"
        DriverAccountLink.objects.create(
            driver_account=driver_account,
            driver_id=driver_id,
        )
        admin_identity = self._create_identity_with_password(
            name="링크 관리자",
            birth_date="1980-01-01",
            email="link-admin@example.com",
            password="link-admin-pass-123",
        )
        SystemAdminAccount.objects.create(identity=admin_identity)
        self.client.force_authenticate(
            user=IdentitySessionPrincipal.from_identity(admin_identity),
        )

        response = self.client.get(f"/driver-account-links/?driver_id={driver_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["driver_id"], driver_id)
        self.assertEqual(response.data[0]["driver_account_id"], str(driver_account.driver_account_id))
        self.assertEqual(response.data[0]["email"], "driver-link@example.com")


class IdentityConsentApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()

    def _create_identity_with_password(
        self,
        *,
        name: str,
        birth_date: str,
        email: str,
        password: str,
    ) -> Identity:
        identity = Identity.objects.create(name=name, birth_date=birth_date)
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
        return identity

    def _login_identity(self, email: str, password: str):
        response = self.client.post(
            "/identity-login/",
            {"email": email, "password": password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")
        if "refresh_token" in response.cookies:
            self.client.cookies["refresh_token"] = response.cookies["refresh_token"].value
        return response

    def test_identity_login_returns_consent_recovery_session_when_required_consent_is_missing(self):
        identity = self._create_identity_with_password(
            name="동의 복구 사용자",
            birth_date="1990-01-02",
            email="consent-recovery@example.com",
            password="consent-recovery-pass-123",
        )
        identity.consent_current.location_policy_consented = False
        identity.consent_current.save(update_fields=["location_policy_consented"])

        response = self._login_identity("consent-recovery@example.com", "consent-recovery-pass-123")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["session_kind"], "consent_recovery")

    def test_consent_recovery_session_can_read_current_consent_but_cannot_open_profile(self):
        identity = self._create_identity_with_password(
            name="차단 사용자",
            birth_date="1990-01-02",
            email="blocked-by-consent@example.com",
            password="blocked-by-consent-pass-123",
        )
        identity.consent_current.location_policy_consented = False
        identity.consent_current.save(update_fields=["location_policy_consented"])
        self._login_identity("blocked-by-consent@example.com", "blocked-by-consent-pass-123")

        consent_response = self.client.get("/identity-consent/")
        profile_response = self.client.get("/identity-profile/")

        self.assertEqual(consent_response.status_code, 200)
        self.assertFalse(consent_response.data["location_policy_consented"])
        self.assertEqual(profile_response.status_code, 403)

    def test_withdrawing_required_consent_rotates_into_recovery_session(self):
        identity = self._create_identity_with_password(
            name="철회 사용자",
            birth_date="1990-01-02",
            email="withdraw-consent@example.com",
            password="withdraw-consent-pass-123",
        )
        self._login_identity("withdraw-consent@example.com", "withdraw-consent-pass-123")

        response = self.client.post(
            "/identity-consent/withdraw/",
            {"consent_type": "location_policy"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["session_kind"], "consent_recovery")
        identity.consent_current.refresh_from_db()
        self.assertFalse(identity.consent_current.location_policy_consented)

    def test_reconsenting_restores_normal_session(self):
        identity = self._create_identity_with_password(
            name="재동의 사용자",
            birth_date="1990-01-02",
            email="reconsent@example.com",
            password="reconsent-pass-123",
        )
        identity.consent_current.privacy_policy_consented = False
        identity.consent_current.location_policy_consented = False
        identity.consent_current.save(
            update_fields=["privacy_policy_consented", "location_policy_consented"]
        )
        self._login_identity("reconsent@example.com", "reconsent-pass-123")

        response = self.client.post(
            "/identity-consent/recover/",
            {
                "privacy_policy_version": "v2.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v2.0",
                "location_policy_consented": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["session_kind"], "normal")
        identity.consent_current.refresh_from_db()
        self.assertTrue(identity.consent_current.privacy_policy_consented)
        self.assertTrue(identity.consent_current.location_policy_consented)


class IdentityLoginMethodApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()
        self.company_id = "30000000-0000-0000-0000-000000000001"

    def _create_identity_with_password(
        self,
        *,
        name: str,
        birth_date: str,
        email: str,
        password: str,
    ) -> Identity:
        identity = Identity.objects.create(name=name, birth_date=birth_date)
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
        return identity

    def _login_identity(self, email: str, password: str):
        response = self.client.post(
            "/identity-login/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")
        if "refresh_token" in response.cookies:
            self.client.cookies["refresh_token"] = response.cookies["refresh_token"].value
        return response

    def test_identity_user_can_list_methods_and_add_phone_method(self):
        identity = self._create_identity_with_password(
            name="로그인 수단 사용자",
            birth_date="1990-01-02",
            email="methods@example.com",
            password="methods-pass-123",
        )
        self._login_identity("methods@example.com", "methods-pass-123")

        list_response = self.client.get("/identity-login-methods/")
        create_response = self.client.post(
            "/identity-login-methods/",
            {
                "method_type": IdentityLoginMethod.MethodType.PHONE,
                "phone_number": "01012341234",
            },
            format="json",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data["methods"]), 1)
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["method_type"], IdentityLoginMethod.MethodType.PHONE)
        self.assertTrue(
            PhoneCredential.objects.filter(
                identity_login_method__identity=identity,
                phone_number="01012341234",
            ).exists()
        )

    @patch("accounts.serializers.SocialProviderService.resolve_subject")
    def test_identity_user_can_add_social_login_method_with_provider_access_token(self, resolve_subject):
        resolve_subject.return_value = {
            "provider_type": SocialCredential.ProviderType.KAKAO,
            "provider_subject": "kakao-linked-123",
        }
        identity = self._create_identity_with_password(
            name="소셜추가 사용자",
            birth_date="1990-01-02",
            email="social-add@example.com",
            password="social-add-pass-123",
        )
        self._login_identity("social-add@example.com", "social-add-pass-123")

        response = self.client.post(
            "/identity-login-methods/",
            {
                "method_type": IdentityLoginMethod.MethodType.SOCIAL,
                "provider_type": SocialCredential.ProviderType.KAKAO,
                "provider_access_token": "kakao-access-token",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["method_type"], IdentityLoginMethod.MethodType.SOCIAL)
        self.assertTrue(
            SocialCredential.objects.filter(
                identity_login_method__identity=identity,
                provider_type=SocialCredential.ProviderType.KAKAO,
                provider_subject="kakao-linked-123",
            ).exists()
        )

    def test_identity_user_cannot_add_email_already_connected_to_another_identity(self):
        self._create_identity_with_password(
            name="기존 이메일 소유자",
            birth_date="1990-01-02",
            email="taken@example.com",
            password="taken-pass-123",
        )
        self._create_identity_with_password(
            name="다른 사용자",
            birth_date="1991-02-03",
            email="other@example.com",
            password="other-pass-123",
        )
        self._login_identity("other@example.com", "other-pass-123")

        response = self.client.post(
            "/identity-login-methods/",
            {
                "method_type": IdentityLoginMethod.MethodType.EMAIL,
                "email": "taken@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("email", response.data["details"])

    def test_identity_user_can_change_shared_password(self):
        self._create_identity_with_password(
            name="비밀번호 사용자",
            birth_date="1990-01-02",
            email="password-owner@example.com",
            password="before-password-123",
        )
        self._login_identity("password-owner@example.com", "before-password-123")

        response = self.client.put(
            "/identity-password/",
            {
                "current_password": "before-password-123",
                "new_password": "after-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        fresh_client = APIClient()
        failed_login = fresh_client.post(
            "/identity-login/",
            {"email": "password-owner@example.com", "password": "before-password-123"},
            format="json",
        )
        succeeded_login = fresh_client.post(
            "/identity-login/",
            {"email": "password-owner@example.com", "password": "after-password-123"},
            format="json",
        )

        self.assertNotEqual(failed_login.status_code, 200)
        self.assertEqual(succeeded_login.status_code, 200)

    def test_deleting_last_login_method_archives_identity_and_accounts(self):
        identity = self._create_identity_with_password(
            name="마지막 수단 사용자",
            birth_date="1990-01-02",
            email="last-method@example.com",
            password="last-method-pass-123",
        )
        ManagerAccount.objects.create(
            identity=identity,
            company_id=self.company_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        login_method = identity.login_methods.get()
        self._login_identity("last-method@example.com", "last-method-pass-123")

        response = self.client.post(
            f"/identity-login-methods/{login_method.identity_login_method_id}/delete/",
            {
                "confirm": True,
                "current_password": "last-method-pass-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 204)
        identity.refresh_from_db()
        self.assertEqual(identity.status, Identity.Status.ARCHIVED)
        self.assertFalse(identity.login_methods.exists())
        self.assertFalse(PasswordCredential.objects.filter(identity=identity).exists())
        self.assertEqual(identity.manager_accounts.get().status, ManagerAccount.Status.ARCHIVED)

    def test_archived_identity_can_self_recover_with_new_email_and_password(self):
        identity = self._create_identity_with_password(
            name="복구 대상",
            birth_date="1990-01-02",
            email="before-recovery@example.com",
            password="before-recovery-pass-123",
        )
        identity.status = Identity.Status.ARCHIVED
        identity.archived_at = timezone.now()
        identity.save(update_fields=["status", "archived_at"])
        identity.login_methods.all().delete()
        PasswordCredential.objects.filter(identity=identity).delete()

        response = self.client.post(
            "/identity-recovery/",
            {
                "name": "복구 대상",
                "birth_date": "1990-01-02",
                "email": "after-recovery@example.com",
                "password": "after-recovery-pass-123",
                "privacy_policy_version": "v2.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v2.0",
                "location_policy_consented": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        identity.refresh_from_db()
        self.assertEqual(identity.status, Identity.Status.ACTIVE)
        self.assertTrue(
            EmailCredential.objects.filter(
                identity_login_method__identity=identity,
                email="after-recovery@example.com",
            ).exists()
        )
        self.assertTrue(PasswordCredential.objects.filter(identity=identity).exists())
        self.assertEqual(response.data["session_kind"], "normal")

    @patch("accounts.services.identity_auth_service.SocialProviderService.resolve_subject")
    def test_identity_login_supports_social_login_for_existing_identity(self, resolve_subject):
        resolve_subject.return_value = {
            "provider_type": SocialCredential.ProviderType.KAKAO,
            "provider_subject": "kakao-existing-123",
        }
        identity = Identity.objects.create(name="카카오 사용자", birth_date="1990-01-02")
        now = timezone.now()
        login_method = IdentityLoginMethod.objects.create(
            identity=identity,
            method_type=IdentityLoginMethod.MethodType.SOCIAL,
            verified_at=now,
        )
        SocialCredential.objects.create(
            identity_login_method=login_method,
            provider_type=SocialCredential.ProviderType.KAKAO,
            provider_subject="kakao-existing-123",
            verified_at=now,
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

        response = self.client.post(
            "/identity-login/",
            {
                "provider_type": SocialCredential.ProviderType.KAKAO,
                "provider_access_token": "kakao-access-token",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["identity"]["identity_id"], str(identity.identity_id))
        self.assertEqual(response.data["session_kind"], "normal")


class ErrorResponseApiTests(SimpleTestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_unknown_route_returns_json_error_envelope(self):
        response = self.client.get("/does-not-exist/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(
            response.json(),
            {
                "code": "not_found",
                "message": "Requested API endpoint was not found.",
                "details": {},
            },
        )
