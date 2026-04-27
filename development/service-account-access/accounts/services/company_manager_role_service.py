import re
import uuid

from django.db import transaction
from django.db.models import Max
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import CompanyManagerRole, ManagerAccount
from accounts.session_principal import IdentitySessionPrincipal
from accounts.services.navigation_policy_service import DEFAULT_MANAGER_ROLE_POLICY


class CompanyManagerRoleService:
    DEFAULT_ROLE_SPECS = (
        {
            "code": ManagerAccount.RoleType.COMPANY_SUPER_ADMIN,
            "display_name": "회사 전체 관리자",
            "display_order": 1,
            "scope_level": CompanyManagerRole.ScopeLevel.COMPANY,
            "is_system_required": True,
            "is_default": True,
        },
        {
            "code": ManagerAccount.RoleType.VEHICLE_MANAGER,
            "display_name": "차량 관리자",
            "display_order": 2,
            "scope_level": CompanyManagerRole.ScopeLevel.COMPANY,
            "is_system_required": False,
            "is_default": True,
        },
        {
            "code": ManagerAccount.RoleType.SETTLEMENT_MANAGER,
            "display_name": "정산 관리자",
            "display_order": 3,
            "scope_level": CompanyManagerRole.ScopeLevel.COMPANY,
            "is_system_required": False,
            "is_default": True,
        },
        {
            "code": ManagerAccount.RoleType.FLEET_MANAGER,
            "display_name": "플릿 관리자",
            "display_order": 4,
            "scope_level": CompanyManagerRole.ScopeLevel.FLEET,
            "is_system_required": False,
            "is_default": True,
        },
    )
    CUSTOM_CODE_PREFIX = "custom_role_"

    def _require_manageable_company(
        self,
        principal: IdentitySessionPrincipal,
        company_id: uuid.UUID | str,
    ) -> uuid.UUID:
        normalized_company_id = uuid.UUID(str(company_id))
        if principal.system_admin_account is not None:
            return normalized_company_id
        manager_account = principal.manager_account
        if (
            manager_account is None
            or manager_account.role_type != ManagerAccount.RoleType.COMPANY_SUPER_ADMIN
        ):
            raise PermissionDenied("Manager roles can be managed only by system admin or company super admin accounts.")
        if manager_account.company_id != normalized_company_id:
            raise PermissionDenied("Company super admin can manage roles only in own company.")
        return normalized_company_id

    def _get_manageable_role(
        self,
        principal: IdentitySessionPrincipal,
        role_id: uuid.UUID | str,
    ) -> CompanyManagerRole:
        role = CompanyManagerRole.objects.filter(
            company_manager_role_id=role_id,
            is_active=True,
        ).first()
        if role is None:
            raise ValidationError("관리자 역할을 찾을 수 없습니다.")
        self._require_manageable_company(principal, role.company_id)
        return role

    @transaction.atomic
    def ensure_default_roles(self, company_id: uuid.UUID | str) -> None:
        normalized_company_id = uuid.UUID(str(company_id))
        for spec in self.DEFAULT_ROLE_SPECS:
            role, created = CompanyManagerRole.objects.get_or_create(
                company_id=normalized_company_id,
                code=spec["code"],
                defaults={
                    "display_name": spec["display_name"],
                    "display_order": spec["display_order"],
                    "scope_level": spec["scope_level"],
                    "is_system_required": spec["is_system_required"],
                    "is_default": spec["is_default"],
                    "is_active": True,
                    "allowed_nav_keys": list(DEFAULT_MANAGER_ROLE_POLICY.get(spec["code"], [])),
                },
            )
            if created:
                continue
            update_fields = []
            if not role.is_active:
                role.is_active = True
                update_fields.append("is_active")
            if role.is_system_required != spec["is_system_required"]:
                role.is_system_required = spec["is_system_required"]
                update_fields.append("is_system_required")
            if role.is_default != spec["is_default"]:
                role.is_default = spec["is_default"]
                update_fields.append("is_default")
            if role.display_name != spec["display_name"] and spec["is_system_required"]:
                role.display_name = spec["display_name"]
                update_fields.append("display_name")
            if role.scope_level != spec["scope_level"]:
                role.scope_level = spec["scope_level"]
                update_fields.append("scope_level")
            if update_fields:
                role.save(update_fields=update_fields)

    def _assigned_count(self, role: CompanyManagerRole) -> int:
        return ManagerAccount.objects.filter(
            company_id=role.company_id,
            role_type=role.code,
            status=ManagerAccount.Status.ACTIVE,
        ).count()

    def _serialize_role(self, role: CompanyManagerRole) -> dict:
        assigned_count = self._assigned_count(role)
        delete_block_reason = None
        can_delete = True
        if role.is_system_required:
            can_delete = False
            delete_block_reason = "필수 역할은 삭제할 수 없습니다."
        elif assigned_count > 0:
            can_delete = False
            delete_block_reason = "배정된 관리자가 있는 역할은 삭제할 수 없습니다."
        return {
            "company_manager_role_id": role.company_manager_role_id,
            "company_id": role.company_id,
            "code": role.code,
            "display_name": role.display_name,
            "display_order": role.display_order,
            "scope_level": role.scope_level,
            "is_system_required": role.is_system_required,
            "is_default": role.is_default,
            "allowed_nav_keys": list(role.allowed_nav_keys),
            "assigned_count": assigned_count,
            "can_delete": can_delete,
            "delete_block_reason": delete_block_reason,
        }

    def list_roles(
        self,
        principal: IdentitySessionPrincipal,
        company_id: uuid.UUID | str,
    ) -> list[dict]:
        normalized_company_id = self._require_manageable_company(principal, company_id)
        self.ensure_default_roles(normalized_company_id)
        roles = CompanyManagerRole.objects.filter(
            company_id=normalized_company_id,
            is_active=True,
        ).order_by("display_order", "created_at", "company_manager_role_id")
        return [self._serialize_role(role) for role in roles]

    def _next_custom_code(self, company_id: uuid.UUID) -> str:
        existing_codes = CompanyManagerRole.objects.filter(
            company_id=company_id,
            is_active=True,
            code__startswith=self.CUSTOM_CODE_PREFIX,
        ).values_list("code", flat=True)
        next_index = 1
        pattern = re.compile(rf"^{self.CUSTOM_CODE_PREFIX}(\d+)$")
        for code in existing_codes:
            match = pattern.match(code)
            if match:
                next_index = max(next_index, int(match.group(1)) + 1)
        return f"{self.CUSTOM_CODE_PREFIX}{next_index}"

    def _next_display_order(self, company_id: uuid.UUID) -> int:
        current_max = (
            CompanyManagerRole.objects.filter(company_id=company_id, is_active=True)
            .aggregate(max_display_order=Max("display_order"))
            .get("max_display_order")
        )
        return (current_max or 0) + 1

    @transaction.atomic
    def create_role(
        self,
        principal: IdentitySessionPrincipal,
        company_id: uuid.UUID | str,
        display_name: str,
        scope_level: str,
    ) -> dict:
        normalized_company_id = self._require_manageable_company(principal, company_id)
        self.ensure_default_roles(normalized_company_id)
        role = CompanyManagerRole.objects.create(
            company_id=normalized_company_id,
            code=self._next_custom_code(normalized_company_id),
            display_name=display_name.strip(),
            display_order=self._next_display_order(normalized_company_id),
            scope_level=scope_level,
            is_system_required=False,
            is_default=False,
            is_active=True,
        )
        return self._serialize_role(role)

    @transaction.atomic
    def update_role(
        self,
        principal: IdentitySessionPrincipal,
        role_id: uuid.UUID | str,
        *,
        code: str | None = None,
        display_name: str | None = None,
        scope_level: str | None = None,
    ) -> dict:
        role = self._get_manageable_role(principal, role_id)
        update_fields: list[str] = []

        if display_name is not None:
            normalized_display_name = display_name.strip()
            if role.display_name != normalized_display_name:
                role.display_name = normalized_display_name
                update_fields.append("display_name")

        if code is not None:
            normalized_code = code.strip()
            if role.code != normalized_code:
                if role.is_system_required or role.is_default:
                    raise ValidationError({"code": ["기본 역할의 영문 변수명은 변경할 수 없습니다."]})
                if self._assigned_count(role) > 0:
                    raise ValidationError({"code": ["배정된 관리자가 있는 역할의 영문 변수명은 변경할 수 없습니다."]})
                if CompanyManagerRole.objects.filter(
                    company_id=role.company_id,
                    code=normalized_code,
                    is_active=True,
                ).exclude(company_manager_role_id=role.company_manager_role_id).exists():
                    raise ValidationError({"code": ["같은 회사에서 이미 사용 중인 영문 변수명입니다."]})
                role.code = normalized_code
                update_fields.append("code")

        if scope_level is not None and role.scope_level != scope_level:
            if role.code == ManagerAccount.RoleType.COMPANY_SUPER_ADMIN:
                raise ValidationError({"scope_level": ["회사 전체 관리자 역할 범위는 변경할 수 없습니다."]})
            if self._assigned_count(role) > 0:
                raise ValidationError({"scope_level": ["배정된 관리자가 있는 역할은 범위를 변경할 수 없습니다."]})
            role.scope_level = scope_level
            update_fields.append("scope_level")

        if update_fields:
            role.save(update_fields=update_fields)
        return self._serialize_role(role)

    @transaction.atomic
    def reorder_roles(
        self,
        principal: IdentitySessionPrincipal,
        company_id: uuid.UUID | str,
        role_ids: list[uuid.UUID | str],
    ) -> list[dict]:
        normalized_company_id = self._require_manageable_company(principal, company_id)
        self.ensure_default_roles(normalized_company_id)
        roles = list(
            CompanyManagerRole.objects.filter(
                company_id=normalized_company_id,
                is_active=True,
            )
        )
        roles_by_id = {str(role.company_manager_role_id): role for role in roles}
        submitted_ids = [str(role_id) for role_id in role_ids]
        existing_ids = {str(role.company_manager_role_id) for role in roles}
        if set(submitted_ids) != existing_ids:
            raise ValidationError({"role_ids": ["현재 회사의 활성 역할 전체 순서를 보내야 합니다."]})

        for index, role_id in enumerate(submitted_ids, start=1):
            role = roles_by_id[role_id]
            if role.display_order != index:
                role.display_order = index
                role.save(update_fields=["display_order"])

        return self.list_roles(principal, normalized_company_id)

    @transaction.atomic
    def update_role_policy(
        self,
        principal: IdentitySessionPrincipal,
        role_id: uuid.UUID | str,
        allowed_nav_keys: list[str],
    ) -> dict:
        if principal.system_admin_account is None:
            raise PermissionDenied("Menu policy management is allowed only for system admin accounts.")
        role = self._get_manageable_role(principal, role_id)
        role.allowed_nav_keys = sorted(set(allowed_nav_keys))
        role.save(update_fields=["allowed_nav_keys"])
        return self._serialize_role(role)

    @transaction.atomic
    def delete_role(
        self,
        principal: IdentitySessionPrincipal,
        role_id: uuid.UUID | str,
    ) -> None:
        role = self._get_manageable_role(principal, role_id)
        if role.is_system_required:
            raise ValidationError("필수 역할은 삭제할 수 없습니다.")
        if self._assigned_count(role) > 0:
            raise ValidationError("배정된 관리자가 있는 역할은 삭제할 수 없습니다.")
        role.is_active = False
        role.save(update_fields=["is_active"])
