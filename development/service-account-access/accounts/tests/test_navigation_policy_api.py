import uuid

from django.db import IntegrityError
from django.test import TestCase
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from accounts.models import DriverAccount, Identity, ManagerAccount, ManagerNavigationPolicy, SystemAdminAccount
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

    def test_global_and_company_policy_rows_can_coexist_for_same_role_and_nav_key(self):
        ManagerNavigationPolicy.objects.create(
            company_id=None,
            manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
            nav_item_key="dashboard",
            updated_by_identity_id=self.system_identity.identity_id,
        )
        ManagerNavigationPolicy.objects.create(
            company_id=self.company_a_id,
            manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
            nav_item_key="dashboard",
            updated_by_identity_id=self.company_admin_identity.identity_id,
        )

        self.assertEqual(
            ManagerNavigationPolicy.objects.filter(
                manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
                nav_item_key="dashboard",
            ).count(),
            2,
        )

    def test_same_company_cannot_duplicate_policy_key_for_same_role(self):
        ManagerNavigationPolicy.objects.create(
            company_id=self.company_a_id,
            manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
            nav_item_key="dashboard",
            updated_by_identity_id=self.company_admin_identity.identity_id,
        )

        with self.assertRaises(IntegrityError):
            ManagerNavigationPolicy.objects.create(
                company_id=self.company_a_id,
                manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
                nav_item_key="dashboard",
                updated_by_identity_id=self.company_admin_identity.identity_id,
            )

    def test_system_admin_can_replace_global_policy_for_vehicle_manager(self):
        allowed_nav_keys = self.service.replace_global_policy(
            self.system_principal,
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard", "vehicles"],
        )

        self.assertEqual(allowed_nav_keys, ["dashboard", "vehicles"])
        result = self.service.get_allowed_nav_keys_for_principal(self.vehicle_principal)
        self.assertEqual(result["source"], "global")
        self.assertEqual(result["allowed_nav_keys"], ["dashboard", "vehicles"])

    def test_company_override_wins_over_global_for_same_manager_role(self):
        self.service.replace_global_policy(
            self.system_principal,
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard", "vehicles"],
        )
        self.service.replace_company_policy(
            self.company_admin_principal,
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard"],
        )

        company_a_result = self.service.get_allowed_nav_keys_for_principal(self.vehicle_principal)
        company_b_result = self.service.get_allowed_nav_keys_for_principal(self.vehicle_b_principal)

        self.assertEqual(company_a_result["source"], "company_override")
        self.assertEqual(company_a_result["allowed_nav_keys"], ["dashboard"])
        self.assertEqual(company_b_result["source"], "global")
        self.assertEqual(company_b_result["allowed_nav_keys"], ["dashboard", "vehicles"])

    def test_system_admin_still_receives_full_menu_even_when_policies_exist(self):
        self.service.replace_global_policy(
            self.system_principal,
            ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
            ["dashboard"],
        )

        result = self.service.get_allowed_nav_keys_for_principal(self.system_principal)

        self.assertEqual(result["source"], "system_admin")
        self.assertIn("manager_navigation_policy", result["allowed_nav_keys"])
        self.assertIn("company_navigation_policy", result["allowed_nav_keys"])
        self.assertIn("settlements", result["allowed_nav_keys"])

    def test_company_reset_deletes_only_company_rows_and_keeps_global_rows(self):
        self.service.replace_global_policy(
            self.system_principal,
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard", "vehicles"],
        )
        self.service.replace_company_policy(
            self.company_admin_principal,
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard"],
        )

        self.service.reset_company_policy(
            self.company_admin_principal,
            ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self.assertFalse(
            ManagerNavigationPolicy.objects.filter(
                company_id=self.company_a_id,
                manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
            ).exists()
        )
        self.assertTrue(
            ManagerNavigationPolicy.objects.filter(
                company_id__isnull=True,
                manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
                nav_item_key="dashboard",
            ).exists()
        )
        result = self.service.get_allowed_nav_keys_for_principal(self.vehicle_principal)
        self.assertEqual(result["source"], "global")
        self.assertEqual(result["allowed_nav_keys"], ["dashboard", "vehicles"])

    def test_non_system_admin_cannot_replace_global_policy(self):
        with self.assertRaises(PermissionDenied):
            self.service.replace_global_policy(
                self.vehicle_principal,
                ManagerAccount.RoleType.VEHICLE_MANAGER,
                ["dashboard"],
            )

    def test_non_company_super_admin_cannot_replace_company_policy(self):
        with self.assertRaises(PermissionDenied):
            self.service.replace_company_policy(
                self.vehicle_principal,
                ManagerAccount.RoleType.VEHICLE_MANAGER,
                ["dashboard"],
            )


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

    def test_system_admin_can_update_global_navigation_policy(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        response = self.client.put(
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

        self.assertEqual(response.status_code, 200)
        vehicle_policy = next(
            policy
            for policy in response.data["policies"]
            if policy["role_type"] == ManagerAccount.RoleType.VEHICLE_MANAGER
        )
        self.assertEqual(vehicle_policy["allowed_nav_keys"], ["dashboard", "vehicles"])
        self.assertEqual(vehicle_policy["source"], "global")

    def test_company_super_admin_can_manage_company_navigation_policy(self):
        service = NavigationPolicyService()
        service.replace_global_policy(
            IdentitySessionPrincipal.from_identity(self.system_identity),
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard", "vehicles"],
        )
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        get_response = self.client.get("/company-navigation-policy/manage/")
        self.assertEqual(get_response.status_code, 200)
        vehicle_policy = next(
            policy for policy in get_response.data["policies"] if policy["role_type"] == ManagerAccount.RoleType.VEHICLE_MANAGER
        )
        self.assertEqual(vehicle_policy["source"], "global")

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
        self.assertEqual(put_response.status_code, 200)
        updated_policy = next(
            policy for policy in put_response.data["policies"] if policy["role_type"] == ManagerAccount.RoleType.VEHICLE_MANAGER
        )
        self.assertEqual(updated_policy["source"], "company_override")
        self.assertEqual(updated_policy["allowed_nav_keys"], ["dashboard"])

    def test_company_reset_reverts_to_global_policy(self):
        service = NavigationPolicyService()
        service.replace_global_policy(
            IdentitySessionPrincipal.from_identity(self.system_identity),
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard", "vehicles"],
        )
        service.replace_company_policy(
            IdentitySessionPrincipal.from_identity(self.company_admin_identity),
            ManagerAccount.RoleType.VEHICLE_MANAGER,
            ["dashboard"],
        )
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        response = self.client.post(
            "/company-navigation-policy/reset/",
            {"role_type": ManagerAccount.RoleType.VEHICLE_MANAGER},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        vehicle_policy = next(
            policy for policy in response.data["policies"] if policy["role_type"] == ManagerAccount.RoleType.VEHICLE_MANAGER
        )
        self.assertEqual(vehicle_policy["source"], "global")
        self.assertEqual(vehicle_policy["allowed_nav_keys"], ["dashboard", "vehicles"])

    def test_vehicle_manager_cannot_manage_global_navigation_policy(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.vehicle_identity))

        response = self.client.get("/manager-navigation-policy/manage/")

        self.assertEqual(response.status_code, 403)

    def test_system_admin_cannot_manage_company_navigation_policy(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        response = self.client.get("/company-navigation-policy/manage/")

        self.assertEqual(response.status_code, 403)

    def test_company_override_is_company_scoped_without_cross_company_input(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        self.client.put(
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

        self.assertTrue(
            ManagerNavigationPolicy.objects.filter(
                company_id=self.company_a_id,
                manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
                nav_item_key="dashboard",
            ).exists()
        )
        self.assertFalse(
            ManagerNavigationPolicy.objects.filter(
                company_id=self.company_b_id,
                manager_role=ManagerAccount.RoleType.VEHICLE_MANAGER,
            ).exists()
        )
