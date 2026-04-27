from unittest.mock import patch
from uuid import UUID

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Identity, ManagerAccount, SystemAdminAccount
from accounts.session_principal import IdentitySessionPrincipal


class WorkspaceBootstrapApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.company_a_id = UUID("30000000-0000-0000-0000-000000000001")
        self.company_b_id = UUID("30000000-0000-0000-0000-000000000002")

    def _authenticate_manager(self, company_id: UUID) -> None:
        identity = Identity.objects.create(name="회사 관리자", birth_date="1990-01-02")
        ManagerAccount.objects.create(
            identity=identity,
            company_id=company_id,
            role_type=ManagerAccount.RoleType.SETTLEMENT_MANAGER,
        )
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(identity))

    def _authenticate_system_admin(self) -> None:
        identity = Identity.objects.create(name="시스템 관리자", birth_date="1980-01-02")
        SystemAdminAccount.objects.create(identity=identity)
        self.client.force_authenticate(user=IdentitySessionPrincipal.from_identity(identity))

    @patch("accounts.services.workspace_bootstrap_service.OrganizationTenantLookupClient.resolve_tenant")
    def test_manager_can_fetch_workspace_bootstrap_for_matching_tenant(self, resolve_tenant):
        self._authenticate_manager(self.company_a_id)
        resolve_tenant.return_value = {
            "company_id": str(self.company_a_id),
            "company_name": "Cheonha Logistics",
            "tenant_code": "cheonha",
            "workflow_profile": "cheonha_ops_v1",
            "enabled_features": ["settlement", "vehicle"],
            "home_dashboard_preset": {
                "cards": ["settlement", "vehicle", "placeholder", "placeholder"],
            },
            "workspace_presets": {
                "settlement": {
                    "tabs": [
                        "dispatch-data",
                        "driver-management",
                        "operations-status",
                        "settlement-processing",
                        "team-management",
                    ]
                }
            },
        }

        response = self.client.get("/workspace-bootstrap/", {"tenant_code": "cheonha"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_id"], str(self.company_a_id))
        self.assertEqual(response.data["company_name"], "Cheonha Logistics")
        self.assertEqual(response.data["tenant_code"], "cheonha")
        self.assertEqual(response.data["workflow_profile"], "cheonha_ops_v1")
        self.assertEqual(response.data["enabled_features"], ["settlement", "vehicle"])
        self.assertEqual(
            response.data["home_dashboard_preset"],
            {"cards": ["settlement", "vehicle", "placeholder", "placeholder"]},
        )

    @patch("accounts.services.workspace_bootstrap_service.OrganizationTenantLookupClient.resolve_tenant")
    def test_manager_cannot_fetch_workspace_bootstrap_for_other_company_tenant(self, resolve_tenant):
        self._authenticate_manager(self.company_a_id)
        resolve_tenant.return_value = {
            "company_id": str(self.company_b_id),
            "company_name": "Other Company",
            "tenant_code": "other",
            "workflow_profile": "other_ops_v1",
            "enabled_features": ["settlement"],
            "home_dashboard_preset": {"cards": ["settlement"]},
            "workspace_presets": {"settlement": {"tabs": ["dispatch-data"]}},
        }

        response = self.client.get("/workspace-bootstrap/", {"tenant_code": "other"})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "permission_denied")

    def test_system_admin_can_fetch_platform_admin_bootstrap_without_tenant(self):
        self._authenticate_system_admin()

        response = self.client.get("/workspace-bootstrap/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "company_id": None,
                "company_name": None,
                "tenant_code": None,
                "workflow_profile": "platform_admin",
                "enabled_features": [],
                "home_dashboard_preset": {},
                "workspace_presets": {},
            },
        )
