from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.test import TestCase, override_settings
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from accounts.models import (
    Account,
    EmailCredential,
    Identity,
    IdentityConsentCurrent,
    IdentityConsentHistory,
    IdentityLoginMethod,
    IdentitySignupRequest,
    PasswordCredential,
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

    def test_register_creates_user_account(self):
        response = self.client.post(
            "/register/",
            {"email": "new-user@example.com", "password": "test-pass-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], Account.Role.USER)
        self.assertTrue(Account.objects.filter(email="new-user@example.com").exists())

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
