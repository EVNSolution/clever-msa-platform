import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CompanyManagerRole, DriverAccount, Identity, ManagerAccount, SystemAdminAccount
from accounts.session_principal import IdentitySessionPrincipal
from accounts.services.navigation_policy_service import NavigationPolicyService


class NavigationPolicyServiceTests(TestCase):
    def setUp(self) -> None:
        self.service = NavigationPolicyService()
        self.company_a_id = uuid.UUID("30000000-0000-0000-0000-000000000001")
        self.company_b_id = uuid.UUID("30000000-0000-0000-0000-000000000002")

        self.system_identity = Identity.objects.create(name="시스템 관리자", birth_date="1970-01-01")
        SystemAdminAccount.objects.create(identity=self.system_identity)
        self.system_principal = IdentitySessionPrincipal.from_identity(self.system_identity)

        self.company_admin_identity = Identity.objects.create(name="회사 전체 관리자", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.company_admin_identity,
            company_id=self.company_a_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )
        self.company_admin_principal = IdentitySessionPrincipal.from_identity(self.company_admin_identity)

        self.vehicle_identity = Identity.objects.create(name="차량 관리자 A", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.vehicle_identity,
            company_id=self.company_a_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        self.vehicle_principal = IdentitySessionPrincipal.from_identity(self.vehicle_identity)

        self.vehicle_b_identity = Identity.objects.create(name="차량 관리자 B", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.vehicle_b_identity,
            company_id=self.company_b_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )
        self.vehicle_b_principal = IdentitySessionPrincipal.from_identity(self.vehicle_b_identity)

        self.driver_identity = Identity.objects.create(name="배송원", birth_date="1970-01-01")
        DriverAccount.objects.create(identity=self.driver_identity, company_id=self.company_a_id)
        self.driver_principal = IdentitySessionPrincipal.from_identity(self.driver_identity)

    def test_vehicle_manager_uses_default_nav_policy_when_no_override_exists(self):
        result = self.service.get_allowed_nav_keys_for_principal(self.vehicle_principal)

        self.assertEqual(result["source"], "default")
        self.assertEqual(
            result["allowed_nav_keys"],
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

    def test_driver_account_receives_empty_nav_policy(self):
        result = self.service.get_allowed_nav_keys_for_principal(self.driver_principal)

        self.assertEqual(result["source"], "none")
        self.assertEqual(result["allowed_nav_keys"], [])

    def test_company_role_catalog_policy_wins_for_same_manager_role(self):
        CompanyManagerRole.objects.create(
            company_id=self.company_a_id,
            code=ManagerAccount.RoleType.VEHICLE_MANAGER,
            display_name="차량 관리자",
            is_system_required=False,
            is_default=True,
            allowed_nav_keys=["dashboard", "vehicles"],
        )

        result = self.service.get_allowed_nav_keys_for_principal(self.vehicle_principal)

        self.assertEqual(result["source"], "company_role")
        self.assertEqual(result["allowed_nav_keys"], ["dashboard", "vehicles"])

    def test_system_admin_still_receives_full_menu_even_when_policies_exist(self):
        CompanyManagerRole.objects.create(
            company_id=self.company_a_id,
            code=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
            display_name="회사 전체 관리자",
            is_system_required=True,
            is_default=True,
            allowed_nav_keys=["dashboard"],
        )

        result = self.service.get_allowed_nav_keys_for_principal(self.system_principal)

        self.assertEqual(result["source"], "system_admin")
        self.assertIn("manager_navigation_policy", result["allowed_nav_keys"])
        self.assertIn("manager_roles", result["allowed_nav_keys"])
        self.assertIn("company_navigation_policy", result["allowed_nav_keys"])
        self.assertIn("settlements", result["allowed_nav_keys"])

    def test_company_super_admin_default_policy_includes_manager_roles(self):
        result = self.service.get_allowed_nav_keys_for_principal(self.company_admin_principal)

        self.assertEqual(result["source"], "default")
        self.assertIn("manager_roles", result["allowed_nav_keys"])
        self.assertIn("company_navigation_policy", result["allowed_nav_keys"])

class NavigationPolicyApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.company_a_id = uuid.UUID("30000000-0000-0000-0000-000000000001")
        self.company_b_id = uuid.UUID("30000000-0000-0000-0000-000000000002")

        self.system_identity = Identity.objects.create(name="시스템 관리자", birth_date="1970-01-01")
        SystemAdminAccount.objects.create(identity=self.system_identity)

        self.company_admin_identity = Identity.objects.create(name="회사 전체 관리자", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.company_admin_identity,
            company_id=self.company_a_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

        self.vehicle_identity = Identity.objects.create(name="차량 관리자", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.vehicle_identity,
            company_id=self.company_a_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self.other_company_admin_identity = Identity.objects.create(name="다른 회사 전체 관리자", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.other_company_admin_identity,
            company_id=self.company_b_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

    def test_vehicle_manager_can_fetch_current_navigation_policy(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.vehicle_identity))

        response = self.client.get("/identity-navigation-policy/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["source"], "default")
        self.assertEqual(
            response.data["allowed_nav_keys"],
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

    def test_company_super_admin_can_fetch_current_navigation_policy_with_manager_roles(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        response = self.client.get("/identity-navigation-policy/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["source"], "default")
        self.assertIn("manager_roles", response.data["allowed_nav_keys"])
        self.assertIn("company_navigation_policy", response.data["allowed_nav_keys"])

    def test_identity_navigation_policy_prefers_company_role_catalog_policy(self):
        CompanyManagerRole.objects.create(
            company_id=self.company_a_id,
            code=ManagerAccount.RoleType.VEHICLE_MANAGER,
            display_name="차량 관리자",
            is_system_required=False,
            is_default=True,
            allowed_nav_keys=["dashboard", "vehicles"],
        )
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.vehicle_identity))

        response = self.client.get("/identity-navigation-policy/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["source"], "company_role")
        self.assertEqual(response.data["allowed_nav_keys"], ["dashboard", "vehicles"])

    def test_legacy_manager_navigation_policy_endpoints_are_not_available(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        get_response = self.client.get("/manager-navigation-policy/manage/")
        put_response = self.client.put(
            "/manager-navigation-policy/manage/",
            {
                "policies": [
                    {
                        "role_type": ManagerAccount.RoleType.VEHICLE_MANAGER,
                        "allowed_nav_keys": ["dashboard", "vehicles"],
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(get_response.status_code, 404)
        self.assertEqual(put_response.status_code, 404)

    def test_legacy_company_navigation_policy_endpoints_are_not_available(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        get_response = self.client.get("/company-navigation-policy/manage/")
        put_response = self.client.put(
            "/company-navigation-policy/manage/",
            {
                "policies": [
                    {
                        "role_type": ManagerAccount.RoleType.VEHICLE_MANAGER,
                        "allowed_nav_keys": ["dashboard"],
                    }
                ]
            },
            format="json",
        )
        reset_response = self.client.post(
            "/company-navigation-policy/reset/",
            {"role_type": ManagerAccount.RoleType.VEHICLE_MANAGER},
            format="json",
        )

        self.assertEqual(get_response.status_code, 404)
        self.assertEqual(put_response.status_code, 404)
        self.assertEqual(reset_response.status_code, 404)
