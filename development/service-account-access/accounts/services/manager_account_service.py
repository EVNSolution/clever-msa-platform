from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import CompanyManagerRole, ManagerAccount
from accounts.services.company_manager_role_service import CompanyManagerRoleService
from accounts.services.manager_account_scope_service import ManagerAccountScopeService
from accounts.services.product_account_lifecycle_service import ProductAccountLifecycleService


class ManagerAccountService:
    LOWER_MANAGER_ROLES = {
        ManagerAccount.RoleType.VEHICLE_MANAGER,
        ManagerAccount.RoleType.SETTLEMENT_MANAGER,
        ManagerAccount.RoleType.FLEET_MANAGER,
    }

    def list_manageable_accounts(self, principal):
        queryset = (
            ManagerAccount.objects.select_related("identity")
            .filter(status=ManagerAccount.Status.ACTIVE, identity__status="active")
            .order_by("identity__name", "manager_account_id")
        )

        if getattr(principal, "system_admin_account", None) is not None:
            return queryset

        manager_account = getattr(principal, "manager_account", None)
        if manager_account is None:
            raise PermissionDenied("Manager account management is not allowed for this account.")

        if manager_account.role_type == ManagerAccount.RoleType.COMPANY_SUPER_ADMIN:
            CompanyManagerRoleService().ensure_default_roles(manager_account.company_id)
            return queryset.filter(company_id=manager_account.company_id).filter(
                Q(manager_account_id=manager_account.manager_account_id)
                | ~Q(role_type=ManagerAccount.RoleType.COMPANY_SUPER_ADMIN)
            )

        return queryset.filter(manager_account_id=manager_account.manager_account_id)

    def get_manageable_account(self, principal, manager_account_id):
        account = get_object_or_404(
            ManagerAccount.objects.select_related("identity"),
            manager_account_id=manager_account_id,
        )
        manageable_ids = self.list_manageable_accounts(principal).values_list(
            "manager_account_id",
            flat=True,
        )
        if account.manager_account_id not in manageable_ids:
            raise PermissionDenied("Manager account management is not allowed for this account.")
        return account

    def change_role(
        self,
        principal,
        manager_account: ManagerAccount,
        *,
        role_type: str,
        fleet_ids: list | None = None,
        authorization: str = "",
    ) -> ManagerAccount:
        if getattr(principal, "system_admin_account", None) is None:
            principal_manager = getattr(principal, "manager_account", None)
            if principal_manager is None or principal_manager.role_type != ManagerAccount.RoleType.COMPANY_SUPER_ADMIN:
                raise PermissionDenied("Manager role change is not allowed for this account.")
            if principal_manager.manager_account_id == manager_account.manager_account_id:
                raise PermissionDenied("You cannot change your own manager role.")
            if principal_manager.company_id != manager_account.company_id:
                raise PermissionDenied("Company super admin can change only manager roles in the same company.")

        CompanyManagerRoleService().ensure_default_roles(manager_account.company_id)
        target_role = CompanyManagerRole.objects.filter(
            company_id=manager_account.company_id,
            code=role_type,
            is_active=True,
        ).first()
        if target_role is None:
            raise ValidationError({"role_type": ["Manager role does not exist for this company."]})
        if (
            getattr(principal, "system_admin_account", None) is None
            and target_role.code == ManagerAccount.RoleType.COMPANY_SUPER_ADMIN
        ):
            raise PermissionDenied("Company super admin cannot assign company super admin role.")
        if manager_account.role_type == role_type:
            raise ValidationError({"role_type": ["Manager already has this role."]})

        validated_fleet_ids = ManagerAccountScopeService().validate_role_assignment_scope(
            company_id=manager_account.company_id,
            role=target_role,
            fleet_ids=fleet_ids,
            authorization=authorization,
        )
        manager_account.role_type = target_role.code
        manager_account.save(update_fields=["role_type"])
        ManagerAccountScopeService().sync_assignments(
            manager_account=manager_account,
            fleet_ids=validated_fleet_ids,
        )
        return manager_account

    def archive_account(self, principal, manager_account: ManagerAccount) -> ManagerAccount:
        if manager_account.status != ManagerAccount.Status.ACTIVE:
            raise ValidationError({"status": ["Only active manager accounts can be archived."]})

        if getattr(principal, "system_admin_account", None) is None:
            principal_manager = getattr(principal, "manager_account", None)
            if principal_manager is None:
                raise PermissionDenied("Manager archive is not allowed for this account.")
            if principal_manager.role_type in self.LOWER_MANAGER_ROLES and (
                principal_manager.manager_account_id != manager_account.manager_account_id
            ):
                raise PermissionDenied("You can archive only your own manager account.")
        return ProductAccountLifecycleService().archive_manager_account(manager_account)
