from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from accounts.models import (
    Account,
    DriverAccount,
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
    SystemAdminAccount,
)
from accounts.services.refresh_registry import RefreshRegistry


class AuthApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.registry = RefreshRegistry()
        self.registry.client.flushdb()
        self.admin_password = "admin-pass-123"
        self.user_password = "user-pass-123"
        self.admin = Account.objects.create(
            email="admin@example.com",
            password_hash=make_password(self.admin_password),
            role=Account.Role.ADMIN,
            is_active=True,
        )
        self.user = Account.objects.create(
            email="user@example.com",
            password_hash=make_password(self.user_password),
            role=Account.Role.USER,
            is_active=True,
        )

    def _login_raw(self, email: str, password: str):
        return self.client.post(
            "/login/",
            {"email": email, "password": password},
            format="json",
        )

    def _login(self, email: str, password: str):
        response = self._login_raw(email, password)
        self.assertEqual(response.status_code, 200)
        return response

    def _authenticate(self, email: str, password: str) -> Account:
        response = self._login(email, password)
        token = response.data["access_token"]
        account = Account.objects.get(email=email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return account

    def test_register_is_blocked_in_transition_phase(self):
        response = self.client.post(
            "/register/",
            {"email": "new-user@example.com", "password": "test-pass-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 410)
        self.assertEqual(response.data["code"], "gone")
        self.assertFalse(Account.objects.filter(email="new-user@example.com").exists())

    def test_login_returns_access_token_and_refresh_cookie(self):
        response = self._login(self.admin.email, self.admin_password)

        self.assertIn("access_token", response.data)
        self.assertIn("account", response.data)
        self.assertIn("route_no", response.data["account"])
        self.assertIn("refresh_token", response.cookies)
        self.assertTrue(response.cookies["refresh_token"]["httponly"])

    def test_login_sets_refresh_cookie_flags(self):
        response = self._login(self.admin.email, self.admin_password)
        cookie = response.cookies["refresh_token"]

        self.assertEqual(cookie["path"], "/api/auth/")
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["secure"], "")

    def test_refresh_uses_cookie_and_rotates_registry(self):
        login_response = self._login(self.admin.email, self.admin_password)
        original_cookie = login_response.cookies["refresh_token"].value
        self.client.cookies["refresh_token"] = original_cookie

        refresh_response = self.client.post("/refresh/")

        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn("access_token", refresh_response.data)
        self.assertIn("refresh_token", refresh_response.cookies)
        self.assertNotEqual(refresh_response.cookies["refresh_token"].value, original_cookie)

    def test_logout_removes_refresh_registry(self):
        login_response = self._login(self.admin.email, self.admin_password)
        refresh_token = login_response.cookies["refresh_token"].value
        self.client.cookies["refresh_token"] = refresh_token

        logout_response = self.client.post("/logout/")

        self.assertEqual(logout_response.status_code, 204)
        self.assertFalse(self.registry.is_registered(refresh_token))

    def test_me_requires_authentication_and_returns_account_summary(self):
        unauthenticated = self.client.get("/me/")
        self.assertEqual(unauthenticated.status_code, 401)
        self.assertEqual(set(unauthenticated.data.keys()), {"code", "message", "details"})

        self._authenticate(self.user.email, self.user_password)
        authenticated = self.client.get("/me/")

        self.assertEqual(authenticated.status_code, 200)
        self.assertEqual(authenticated.data["email"], self.user.email)
        self.assertEqual(authenticated.data["role"], Account.Role.USER)

    def test_admin_can_list_and_create_accounts(self):
        self._authenticate(self.admin.email, self.admin_password)

        list_response = self.client.get("/accounts/")
        create_response = self.client.post(
            "/accounts/",
            {
                "email": "created@example.com",
                "password": "created-pass-123",
                "role": Account.Role.USER,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(create_response.status_code, 201)
        self.assertIn("route_no", create_response.data)
        self.assertTrue(Account.objects.filter(email="created@example.com").exists())

    def test_admin_can_read_and_update_account_detail(self):
        self._authenticate(self.admin.email, self.admin_password)

        detail_response = self.client.get(f"/accounts/{self.user.route_no}/")
        patch_response = self.client.patch(
            f"/accounts/{self.user.route_no}/",
            {"role": Account.Role.ADMIN},
            format="json",
        )
        legacy_detail_response = self.client.get(f"/accounts/{self.user.account_id}/")

        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(legacy_detail_response.status_code, 200)
        self.assertEqual(detail_response.data["route_no"], self.user.route_no)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, Account.Role.ADMIN)

    def test_non_admin_account_crud_is_forbidden(self):
        self._authenticate(self.user.email, self.user_password)

        list_response = self.client.get("/accounts/")
        detail_response = self.client.get(f"/accounts/{self.admin.route_no}/")
        patch_response = self.client.patch(
            f"/accounts/{self.admin.route_no}/",
            {"role": Account.Role.ADMIN},
            format="json",
        )

        for response in (list_response, detail_response, patch_response):
            self.assertEqual(response.status_code, 403)
            self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_health_endpoint_responds(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    def test_failed_login_returns_401_envelope(self):
        response = self._login_raw(self.user.email, "wrong-pass-123")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "authentication_failed")
        self.assertEqual(response.data["message"], "Invalid email or password.")
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    @override_settings(LOGIN_LOCKOUT_THRESHOLD=3, LOGIN_LOCKOUT_TTL_SECONDS=60)
    def test_login_is_blocked_after_repeated_failures(self):
        for _ in range(3):
            response = self._login_raw(self.user.email, "wrong-pass-123")
            self.assertEqual(response.status_code, 401)

        blocked_response = self._login_raw(self.user.email, self.user_password)

        self.assertEqual(blocked_response.status_code, 401)
        self.assertEqual(
            blocked_response.data["message"],
            "Account is temporarily locked. Try again later.",
        )

    @override_settings(LOGIN_LOCKOUT_THRESHOLD=3, LOGIN_LOCKOUT_TTL_SECONDS=60)
    def test_successful_login_clears_prior_failed_attempts(self):
        self.assertEqual(self._login_raw(self.user.email, "wrong-pass-123").status_code, 401)
        self.assertEqual(self._login_raw(self.user.email, "wrong-pass-123").status_code, 401)

        success_response = self._login(self.user.email, self.user_password)
        self.assertEqual(success_response.status_code, 200)

        self.assertEqual(self._login_raw(self.user.email, "wrong-pass-123").status_code, 401)
        retry_response = self._login_raw(self.user.email, self.user_password)

        self.assertEqual(retry_response.status_code, 200)

    def test_authenticated_user_can_change_password(self):
        self._authenticate(self.user.email, self.user_password)

        response = self.client.post(
            "/change-password/",
            {
                "current_password": self.user_password,
                "new_password": "updated-pass-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.client.credentials()
        self.assertEqual(self._login_raw(self.user.email, self.user_password).status_code, 401)
        self.assertEqual(self._login_raw(self.user.email, "updated-pass-123").status_code, 200)

    def test_change_password_requires_authentication(self):
        response = self.client.post(
            "/change-password/",
            {
                "current_password": self.user_password,
                "new_password": "updated-pass-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_change_password_rejects_wrong_current_password(self):
        self._authenticate(self.user.email, self.user_password)

        response = self.client.post(
            "/change-password/",
            {
                "current_password": "not-the-current-password",
                "new_password": "updated-pass-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("current_password", response.data["details"])

    def test_change_password_rejects_reusing_current_password(self):
        self._authenticate(self.user.email, self.user_password)

        response = self.client.post(
            "/change-password/",
            {
                "current_password": self.user_password,
                "new_password": self.user_password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("new_password", response.data["details"])

    def test_account_driver_link_requires_admin(self):
        unauthenticated = self.client.post(
            "/account-driver-links/",
            {
                "account_id": str(self.user.account_id),
                "driver_id": "30000000-0000-0000-0000-000000000001",
            },
            format="json",
        )
        self.assertEqual(unauthenticated.status_code, 401)
        self.assertEqual(set(unauthenticated.data.keys()), {"code", "message", "details"})

        self._authenticate(self.user.email, self.user_password)
        forbidden = self.client.post(
            "/account-driver-links/",
            {
                "account_id": str(self.user.account_id),
                "driver_id": "30000000-0000-0000-0000-000000000001",
            },
            format="json",
        )

        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(set(forbidden.data.keys()), {"code", "message", "details"})

    def test_account_driver_link_validates_payload(self):
        self._authenticate(self.admin.email, self.admin_password)

        invalid_uuid = self.client.post(
            "/account-driver-links/",
            {
                "account_id": "not-a-uuid",
                "driver_id": "30000000-0000-0000-0000-000000000001",
            },
            format="json",
        )
        missing_account = self.client.post(
            "/account-driver-links/",
            {
                "account_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "driver_id": "30000000-0000-0000-0000-000000000001",
            },
            format="json",
        )

        self.assertEqual(invalid_uuid.status_code, 400)
        self.assertEqual(invalid_uuid.data["code"], "validation_error")
        self.assertIn("account_id", invalid_uuid.data["details"])
        self.assertEqual(missing_account.status_code, 400)
        self.assertEqual(missing_account.data["code"], "validation_error")
        self.assertIn("account_id", missing_account.data["details"])

    @patch("accounts.views.DriverLinkService.link_account_to_driver")
    def test_admin_can_create_account_driver_link(self, mock_link_account_to_driver):
        self._authenticate(self.admin.email, self.admin_password)
        driver_id = "30000000-0000-0000-0000-000000000001"

        response = self.client.post(
            "/account-driver-links/",
            {
                "account_id": str(self.user.account_id),
                "driver_id": driver_id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {"account_id": str(self.user.account_id), "driver_id": driver_id},
        )
        mock_link_account_to_driver.assert_called_once()
        self.assertEqual(
            mock_link_account_to_driver.call_args.kwargs["account_id"],
            str(self.user.account_id),
        )
        self.assertEqual(
            mock_link_account_to_driver.call_args.kwargs["driver_id"],
            driver_id,
        )
        self.assertTrue(
            mock_link_account_to_driver.call_args.kwargs["authorization"].startswith("Bearer ")
        )

    @patch(
        "accounts.views.DriverLinkService.link_account_to_driver",
        side_effect=ValidationError({"driver_id": ["Driver not found."]}),
    )
    def test_account_driver_link_surfaces_downstream_validation(self, _mock_link_account_to_driver):
        self._authenticate(self.admin.email, self.admin_password)

        response = self.client.post(
            "/account-driver-links/",
            {
                "account_id": str(self.user.account_id),
                "driver_id": "30000000-0000-0000-0000-000000000001",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("driver_id", response.data["details"])

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
        request = self._create_request(
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


class LegacyAuthTransitionApiTests(TestCase):
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

    def _provision_vehicle_manager(
        self,
        *,
        email: str,
        password: str,
    ) -> Identity:
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
        request_identity = self._create_identity_with_password(
            name="전환 대상",
            birth_date="1990-01-02",
            email=email,
            password=password,
        )
        request = IdentitySignupRequest.objects.create(
            identity=request_identity,
            company_id=self.company_id,
            request_type=IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE,
            status=IdentitySignupRequest.Status.PENDING,
        )
        self._login_identity("company-admin@example.com", "company-pass-123")
        approve_response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/approve/",
            format="json",
        )
        self.assertEqual(approve_response.status_code, 200)
        setup_response = self.client.post(
            f"/identity-signup-requests/{request.identity_signup_request_id}/complete-setup/",
            {"role_type": ManagerAccount.RoleType.VEHICLE_MANAGER},
            format="json",
        )
        self.assertEqual(setup_response.status_code, 200)
        self.client.credentials()
        self.client.cookies.clear()
        return request_identity

    def test_manager_setup_creates_legacy_account_projection_and_legacy_login_works(self):
        identity = self._provision_vehicle_manager(
            email="transition-manager@example.com",
            password="transition-pass-123",
        )

        legacy_account = Account.objects.get(identity=identity)
        login_response = self.client.post(
            "/login/",
            {"email": "transition-manager@example.com", "password": "transition-pass-123"},
            format="json",
        )

        self.assertTrue(legacy_account.is_active)
        self.assertEqual(legacy_account.email, "transition-manager@example.com")
        self.assertEqual(legacy_account.role, Account.Role.ADMIN)
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.data["account"]["account_id"], str(legacy_account.account_id))
        self.assertEqual(login_response.data["account"]["role"], Account.Role.ADMIN)

    def test_identity_password_change_updates_legacy_login_projection(self):
        identity = self._provision_vehicle_manager(
            email="projection-password@example.com",
            password="before-projection-pass-123",
        )
        legacy_account = Account.objects.get(identity=identity)

        self._login_identity("projection-password@example.com", "before-projection-pass-123")
        password_response = self.client.put(
            "/identity-password/",
            {
                "current_password": "before-projection-pass-123",
                "new_password": "after-projection-pass-123",
            },
            format="json",
        )

        self.assertEqual(password_response.status_code, 200)
        self.client.credentials()
        self.client.cookies.clear()

        old_login = self.client.post(
            "/login/",
            {"email": legacy_account.email, "password": "before-projection-pass-123"},
            format="json",
        )
        new_login = self.client.post(
            "/login/",
            {"email": legacy_account.email, "password": "after-projection-pass-123"},
            format="json",
        )

        self.assertEqual(old_login.status_code, 401)
        self.assertEqual(new_login.status_code, 200)

    def test_deleting_last_login_method_scrubs_and_deactivates_legacy_projection(self):
        identity = self._provision_vehicle_manager(
            email="scrub-projection@example.com",
            password="scrub-pass-123",
        )
        legacy_account = Account.objects.get(identity=identity)
        login_method = identity.login_methods.get()

        self._login_identity("scrub-projection@example.com", "scrub-pass-123")
        delete_response = self.client.post(
            f"/identity-login-methods/{login_method.identity_login_method_id}/delete/",
            {"confirm": True, "current_password": "scrub-pass-123"},
            format="json",
        )

        self.assertEqual(delete_response.status_code, 204)
        legacy_account.refresh_from_db()
        self.assertFalse(legacy_account.is_active)
        self.assertNotEqual(legacy_account.email, "scrub-projection@example.com")


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
