from rest_framework.exceptions import PermissionDenied

from accounts.models import ManagerAccount, ManagerNavigationPolicy


ALL_NAV_ITEM_KEYS = [
    "dashboard",
    "account",
    "manager_navigation_policy",
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
    COMPANY_MANAGEABLE_ROLES = [
        ManagerAccount.RoleType.VEHICLE_MANAGER,
        ManagerAccount.RoleType.SETTLEMENT_MANAGER,
        ManagerAccount.RoleType.FLEET_MANAGER,
    ]

    def get_default_allowed_nav_keys_for_role(self, role_type: str | None) -> list[str]:
        if role_type is None:
            return []
        return list(DEFAULT_MANAGER_ROLE_POLICY.get(role_type, []))

    def _get_allowed_nav_keys(self, *, role_type: str, company_id: str | None = None) -> list[str]:
        queryset = ManagerNavigationPolicy.objects.filter(
            manager_role=role_type,
            action=ManagerNavigationPolicy.Action.VIEW,
            effect=ManagerNavigationPolicy.Effect.ALLOW,
        )
        if company_id is None:
            queryset = queryset.filter(company_id__isnull=True)
        else:
            queryset = queryset.filter(company_id=company_id)
        return list(queryset.order_by("nav_item_key").values_list("nav_item_key", flat=True))

    def _require_company_super_admin(self, principal) -> ManagerAccount:
        manager_account = getattr(principal, "manager_account", None)
        if manager_account is None or manager_account.role_type != ManagerAccount.RoleType.COMPANY_SUPER_ADMIN:
            raise PermissionDenied("Company navigation policy management is allowed only for company super admin accounts.")
        return manager_account

    def get_allowed_nav_keys_for_principal(self, principal) -> dict[str, object]:
        if principal.system_admin_account is not None:
            return {"allowed_nav_keys": list(ALL_NAV_ITEM_KEYS), "source": "system_admin"}

        manager_account = principal.manager_account
        if manager_account is None:
            return {"allowed_nav_keys": [], "source": "none"}

        company_nav_keys = self._get_allowed_nav_keys(
            role_type=manager_account.role_type,
            company_id=str(manager_account.company_id),
        )
        if company_nav_keys:
            return {"allowed_nav_keys": company_nav_keys, "source": "company_override"}

        stored_nav_keys = self._get_allowed_nav_keys(role_type=manager_account.role_type)
        if stored_nav_keys:
            return {"allowed_nav_keys": stored_nav_keys, "source": "global"}

        return {
            "allowed_nav_keys": self.get_default_allowed_nav_keys_for_role(manager_account.role_type),
            "source": "default",
        }

    def list_global_policy(self) -> list[dict[str, object]]:
        role_types = [choice for choice, _label in ManagerAccount.RoleType.choices]
        policies: list[dict[str, object]] = []
        for role_type in role_types:
            stored_nav_keys = self._get_allowed_nav_keys(role_type=role_type)
            policies.append(
                {
                    "role_type": role_type,
                    "allowed_nav_keys": stored_nav_keys or self.get_default_allowed_nav_keys_for_role(role_type),
                    "source": "global" if stored_nav_keys else "default",
                }
            )
        return policies

    def replace_global_policy(self, principal, role_type: str, nav_keys: list[str]) -> list[str]:
        if principal.system_admin_account is None:
            raise PermissionDenied("Navigation policy management is allowed only for system admin accounts.")

        ManagerNavigationPolicy.objects.filter(
            company_id__isnull=True,
            manager_role=role_type,
            action=ManagerNavigationPolicy.Action.VIEW,
        ).delete()
        ManagerNavigationPolicy.objects.bulk_create(
            [
                ManagerNavigationPolicy(
                    company_id=None,
                    manager_role=role_type,
                    nav_item_key=nav_key,
                    action=ManagerNavigationPolicy.Action.VIEW,
                    effect=ManagerNavigationPolicy.Effect.ALLOW,
                    updated_by_identity_id=principal.identity.identity_id,
                )
                for nav_key in sorted(set(nav_keys))
            ]
        )
        return self._get_allowed_nav_keys(role_type=role_type)

    def list_company_policy(self, principal) -> list[dict[str, object]]:
        manager_account = self._require_company_super_admin(principal)
        company_id = str(manager_account.company_id)
        policies: list[dict[str, object]] = []
        for role_type in self.COMPANY_MANAGEABLE_ROLES:
            company_nav_keys = self._get_allowed_nav_keys(role_type=role_type, company_id=company_id)
            if company_nav_keys:
                policies.append(
                    {
                        "role_type": role_type,
                        "allowed_nav_keys": company_nav_keys,
                        "source": "company_override",
                    }
                )
                continue
            global_nav_keys = self._get_allowed_nav_keys(role_type=role_type)
            if global_nav_keys:
                policies.append(
                    {
                        "role_type": role_type,
                        "allowed_nav_keys": global_nav_keys,
                        "source": "global",
                    }
                )
                continue
            policies.append(
                {
                    "role_type": role_type,
                    "allowed_nav_keys": self.get_default_allowed_nav_keys_for_role(role_type),
                    "source": "default",
                }
            )
        return policies

    def replace_company_policy(self, principal, role_type: str, nav_keys: list[str]) -> list[str]:
        manager_account = self._require_company_super_admin(principal)
        if role_type not in self.COMPANY_MANAGEABLE_ROLES:
            raise PermissionDenied("Company navigation policy override is allowed only for lower manager roles.")
        company_id = manager_account.company_id
        ManagerNavigationPolicy.objects.filter(
            company_id=company_id,
            manager_role=role_type,
            action=ManagerNavigationPolicy.Action.VIEW,
        ).delete()
        ManagerNavigationPolicy.objects.bulk_create(
            [
                ManagerNavigationPolicy(
                    company_id=company_id,
                    manager_role=role_type,
                    nav_item_key=nav_key,
                    action=ManagerNavigationPolicy.Action.VIEW,
                    effect=ManagerNavigationPolicy.Effect.ALLOW,
                    updated_by_identity_id=principal.identity.identity_id,
                )
                for nav_key in sorted(set(nav_keys))
            ]
        )
        return self._get_allowed_nav_keys(role_type=role_type, company_id=str(company_id))

    def reset_company_policy(self, principal, role_type: str) -> None:
        manager_account = self._require_company_super_admin(principal)
        if role_type not in self.COMPANY_MANAGEABLE_ROLES:
            raise PermissionDenied("Company navigation policy override is allowed only for lower manager roles.")
        ManagerNavigationPolicy.objects.filter(
            company_id=manager_account.company_id,
            manager_role=role_type,
            action=ManagerNavigationPolicy.Action.VIEW,
        ).delete()
