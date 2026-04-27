from accounts.models import CompanyManagerRole, ManagerAccount


ALL_NAV_ITEM_KEYS = [
    "dashboard",
    "account",
    "manager_navigation_policy",
    "manager_roles",
    "company_navigation_policy",
    "accounts",
    "announcements",
    "support",
    "notifications",
    "companies",
    "regions",
    "vehicles",
    "vehicle_assignments",
    "drivers",
    "personnel_documents",
    "dispatch",
    "settlements",
]

DEFAULT_MANAGER_ROLE_POLICY = {
    ManagerAccount.RoleType.COMPANY_SUPER_ADMIN: ALL_NAV_ITEM_KEYS,
    ManagerAccount.RoleType.VEHICLE_MANAGER: [
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
    ManagerAccount.RoleType.SETTLEMENT_MANAGER: [
        "dashboard",
        "account",
        "accounts",
        "announcements",
        "support",
        "notifications",
        "regions",
        "drivers",
        "personnel_documents",
        "dispatch",
        "settlements",
    ],
    ManagerAccount.RoleType.FLEET_MANAGER: [
        "dashboard",
        "account",
        "accounts",
        "announcements",
        "support",
        "notifications",
        "regions",
        "drivers",
        "personnel_documents",
        "dispatch",
        "settlements",
    ],
}


class NavigationPolicyService:
    def get_default_allowed_nav_keys_for_role(self, role_type: str | None) -> list[str]:
        if role_type is None:
            return []
        return list(DEFAULT_MANAGER_ROLE_POLICY.get(role_type, []))

    def _get_company_role_policy(self, *, role_type: str, company_id) -> CompanyManagerRole | None:
        return (
            CompanyManagerRole.objects.filter(company_id=company_id, code=role_type, is_active=True)
            .order_by("created_at")
            .first()
        )

    def get_allowed_nav_keys_for_principal(self, principal) -> dict[str, object]:
        if principal.system_admin_account is not None:
            return {"allowed_nav_keys": list(ALL_NAV_ITEM_KEYS), "source": "system_admin"}

        manager_account = principal.manager_account
        if manager_account is None:
            return {"allowed_nav_keys": [], "source": "none"}

        company_role_policy = self._get_company_role_policy(
            role_type=manager_account.role_type,
            company_id=manager_account.company_id,
        )
        if company_role_policy is not None:
            allowed_nav_keys = list(company_role_policy.allowed_nav_keys)
            default_allowed_nav_keys = self.get_default_allowed_nav_keys_for_role(
                manager_account.role_type
            )
            return {
                "allowed_nav_keys": allowed_nav_keys,
                "source": (
                    "default"
                    if allowed_nav_keys == default_allowed_nav_keys
                    else "company_role"
                ),
            }

        return {
            "allowed_nav_keys": self.get_default_allowed_nav_keys_for_role(manager_account.role_type),
            "source": "default",
        }
