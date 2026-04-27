import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Identity, ManagerAccount, SystemAdminAccount
from accounts.session_principal import IdentitySessionPrincipal


class CompanyManagerRoleApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.company_a_id = uuid.UUID("40000000-0000-0000-0000-000000000001")
        self.company_b_id = uuid.UUID("40000000-0000-0000-0000-000000000002")

        self.system_identity = Identity.objects.create(name="시스템 관리자", birth_date="1970-01-01")
        SystemAdminAccount.objects.create(identity=self.system_identity)

        self.company_admin_identity = Identity.objects.create(name="회사 전체 관리자", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.company_admin_identity,
            company_id=self.company_a_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

        self.vehicle_manager_identity = Identity.objects.create(name="차량 관리자", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.vehicle_manager_identity,
            company_id=self.company_a_id,
            role_type=ManagerAccount.RoleType.VEHICLE_MANAGER,
        )

        self.other_company_admin_identity = Identity.objects.create(name="다른 회사 전체 관리자", birth_date="1970-01-01")
        ManagerAccount.objects.create(
            identity=self.other_company_admin_identity,
            company_id=self.company_b_id,
            role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
        )

    def test_system_admin_can_list_seeded_company_roles(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        response = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [role["code"] for role in response.data["roles"]],
            [
                "company_super_admin",
                "vehicle_manager",
                "settlement_manager",
                "fleet_manager",
            ],
        )
        company_super_admin = response.data["roles"][0]
        vehicle_manager = response.data["roles"][1]
        fleet_manager = response.data["roles"][3]
        self.assertEqual(company_super_admin["display_order"], 1)
        self.assertEqual(vehicle_manager["display_order"], 2)
        self.assertEqual(fleet_manager["display_order"], 4)
        self.assertEqual(company_super_admin["display_name"], "회사 전체 관리자")
        self.assertEqual(company_super_admin["scope_level"], "company")
        self.assertTrue(company_super_admin["is_system_required"])
        self.assertEqual(company_super_admin["assigned_count"], 1)
        self.assertFalse(company_super_admin["can_delete"])
        self.assertIn("manager_navigation_policy", company_super_admin["allowed_nav_keys"])
        self.assertEqual(vehicle_manager["scope_level"], "company")
        self.assertEqual(fleet_manager["scope_level"], "fleet")
        self.assertEqual(vehicle_manager["assigned_count"], 1)
        self.assertFalse(vehicle_manager["can_delete"])
        self.assertEqual(
            vehicle_manager["allowed_nav_keys"],
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

    def test_company_super_admin_can_list_only_own_company_roles(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        own_response = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        other_response = self.client.get(f"/company-manager-roles/?company_id={self.company_b_id}")

        self.assertEqual(own_response.status_code, 200)
        self.assertEqual(other_response.status_code, 403)

    def test_system_admin_can_create_custom_company_role(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        response = self.client.post(
            "/company-manager-roles/",
            {
                "company_id": str(self.company_a_id),
                "display_name": "배차 품질 관리자",
                "scope_level": "fleet",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["display_name"], "배차 품질 관리자")
        self.assertEqual(response.data["code"], "custom_role_1")
        self.assertEqual(response.data["scope_level"], "fleet")
        self.assertFalse(response.data["is_system_required"])
        self.assertTrue(response.data["can_delete"])

    def test_company_super_admin_can_rename_role_in_own_company(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        created = self.client.post(
            "/company-manager-roles/",
            {
                "company_id": str(self.company_a_id),
                "display_name": "배차 품질 관리자",
                "scope_level": "fleet",
            },
            format="json",
        )
        role_id = created.data["company_manager_role_id"]

        response = self.client.patch(
            f"/company-manager-roles/{role_id}/",
            {"display_name": "배차 품질 리더", "scope_level": "company"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["display_name"], "배차 품질 리더")
        self.assertEqual(response.data["code"], "custom_role_1")
        self.assertEqual(response.data["scope_level"], "company")

    def test_company_super_admin_can_update_custom_role_code_when_unassigned(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        created = self.client.post(
            "/company-manager-roles/",
            {
                "company_id": str(self.company_a_id),
                "display_name": "배차 품질 관리자",
                "scope_level": "fleet",
            },
            format="json",
        )
        role_id = created.data["company_manager_role_id"]

        response = self.client.patch(
            f"/company-manager-roles/{role_id}/",
            {"code": "dispatch_quality_manager"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["code"], "dispatch_quality_manager")

    def test_default_role_code_cannot_be_changed(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        role_id = next(
            role["company_manager_role_id"]
            for role in listed.data["roles"]
            if role["code"] == "vehicle_manager"
        )

        response = self.client.patch(
            f"/company-manager-roles/{role_id}/",
            {"code": "custom_vehicle_manager"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], ["기본 역할의 영문 변수명은 변경할 수 없습니다."])

    def test_assigned_custom_role_code_cannot_be_changed(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        created = self.client.post(
            "/company-manager-roles/",
            {
                "company_id": str(self.company_a_id),
                "display_name": "배차 품질 관리자",
                "scope_level": "fleet",
            },
            format="json",
        )
        ManagerAccount.objects.create(
            identity=Identity.objects.create(name="커스텀 관리자", birth_date="1988-01-01"),
            company_id=self.company_a_id,
            role_type="custom_role_1",
        )

        response = self.client.patch(
            f"/company-manager-roles/{created.data['company_manager_role_id']}/",
            {"code": "dispatch_quality_manager"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], ["배정된 관리자가 있는 역할의 영문 변수명은 변경할 수 없습니다."])

    def test_scope_level_change_is_blocked_for_assigned_role(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        role_id = next(
            role["company_manager_role_id"]
            for role in listed.data["roles"]
            if role["code"] == "vehicle_manager"
        )

        response = self.client.patch(
            f"/company-manager-roles/{role_id}/",
            {"scope_level": "fleet"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["scope_level"], ["배정된 관리자가 있는 역할은 범위를 변경할 수 없습니다."])

    def test_delete_is_blocked_for_required_role(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        required_role_id = listed.data["roles"][0]["company_manager_role_id"]

        response = self.client.delete(f"/company-manager-roles/{required_role_id}/")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["message"], "필수 역할은 삭제할 수 없습니다.")

    def test_delete_is_blocked_for_assigned_role(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        assigned_role_id = next(
            role["company_manager_role_id"]
            for role in listed.data["roles"]
            if role["code"] == "vehicle_manager"
        )

        response = self.client.delete(f"/company-manager-roles/{assigned_role_id}/")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["message"], "배정된 관리자가 있는 역할은 삭제할 수 없습니다.")

    def test_unassigned_custom_role_can_be_deleted(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        created = self.client.post(
            "/company-manager-roles/",
            {
                "company_id": str(self.company_a_id),
                "display_name": "현장 운영 관리자",
                "scope_level": "company",
            },
            format="json",
        )
        role_id = created.data["company_manager_role_id"]

        delete_response = self.client.delete(f"/company-manager-roles/{role_id}/")
        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")

        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(
            [role["code"] for role in listed.data["roles"]],
            [
                "company_super_admin",
                "vehicle_manager",
                "settlement_manager",
                "fleet_manager",
            ],
        )

    def test_system_admin_can_reorder_roles(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        first = self.client.post(
            "/company-manager-roles/",
            {
                "company_id": str(self.company_a_id),
                "display_name": "배차 품질 관리자",
                "scope_level": "fleet",
            },
            format="json",
        )
        second = self.client.post(
            "/company-manager-roles/",
            {
                "company_id": str(self.company_a_id),
                "display_name": "안전 운영 관리자",
                "scope_level": "company",
            },
            format="json",
        )

        listed_before = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        role_ids_by_name = {
            role["display_name"]: role["company_manager_role_id"]
            for role in listed_before.data["roles"]
        }

        reorder_response = self.client.post(
            "/company-manager-roles/reorder/",
            {
                "company_id": str(self.company_a_id),
                "role_ids": [
                    second.data["company_manager_role_id"],
                    first.data["company_manager_role_id"],
                    role_ids_by_name["회사 전체 관리자"],
                    role_ids_by_name["차량 관리자"],
                    role_ids_by_name["정산 관리자"],
                    role_ids_by_name["플릿 관리자"],
                ],
            },
            format="json",
        )

        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")

        self.assertEqual(reorder_response.status_code, 200)
        self.assertEqual(
            [role["display_name"] for role in listed.data["roles"][:3]],
            ["안전 운영 관리자", "배차 품질 관리자", "회사 전체 관리자"],
        )

    def test_system_admin_can_update_allowed_nav_keys_for_company_role(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.system_identity))

        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        role_id = next(
            role["company_manager_role_id"]
            for role in listed.data["roles"]
            if role["code"] == "vehicle_manager"
        )

        response = self.client.patch(
            f"/company-manager-roles/{role_id}/",
            {"allowed_nav_keys": ["dashboard", "vehicles"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["allowed_nav_keys"], ["dashboard", "vehicles"])

    def test_company_super_admin_cannot_update_allowed_nav_keys(self):
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(self.company_admin_identity))

        listed = self.client.get(f"/company-manager-roles/?company_id={self.company_a_id}")
        role_id = next(
            role["company_manager_role_id"]
            for role in listed.data["roles"]
            if role["code"] == "vehicle_manager"
        )

        response = self.client.patch(
            f"/company-manager-roles/{role_id}/",
            {"allowed_nav_keys": ["dashboard", "vehicles"]},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
