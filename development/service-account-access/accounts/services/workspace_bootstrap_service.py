from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.services.organization_tenant_lookup_client import OrganizationTenantLookupClient


class WorkspaceBootstrapService:
    def __init__(self, tenant_lookup_client: OrganizationTenantLookupClient | None = None):
        self.tenant_lookup_client = tenant_lookup_client or OrganizationTenantLookupClient()

    def build_for_principal(self, principal, *, tenant_code: str | None) -> dict:
        if getattr(principal, "active_account_type", None) == "system_admin" and not tenant_code:
            return {
                "company_id": None,
                "company_name": None,
                "tenant_code": None,
                "workflow_profile": "platform_admin",
                "enabled_features": [],
                "home_dashboard_preset": {},
                "workspace_presets": {},
            }

        if not tenant_code:
            raise ValidationError({"tenant_code": ["This query parameter is required."]})

        payload = self.tenant_lookup_client.resolve_tenant(tenant_code)
        if getattr(principal, "active_account_type", None) == "system_admin":
            return payload

        principal_company_id = getattr(principal, "company_id", None)
        if principal_company_id is None:
            raise PermissionDenied("Tenant workspace requires a company account.")
        if str(principal_company_id) != str(payload["company_id"]):
            raise PermissionDenied("Tenant workspace is not available for this account.")
        return payload
