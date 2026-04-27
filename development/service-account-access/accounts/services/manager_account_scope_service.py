import uuid

from rest_framework.exceptions import ValidationError

from accounts.models import CompanyManagerRole, ManagerAccount, ManagerAccountFleetAssignment
from accounts.services.organization_fleet_lookup_client import OrganizationFleetLookupClient


class ManagerAccountScopeService:
    def __init__(self, fleet_lookup_client: OrganizationFleetLookupClient | None = None):
        self.fleet_lookup_client = fleet_lookup_client or OrganizationFleetLookupClient()

    def validate_role_assignment_scope(
        self,
        *,
        company_id: uuid.UUID | str,
        role: CompanyManagerRole,
        fleet_ids: list[uuid.UUID] | None,
        authorization: str = "",
    ) -> list[uuid.UUID]:
        normalized_company_id = str(company_id)
        normalized_fleet_ids = self._normalize_fleet_ids(fleet_ids)

        if role.scope_level == CompanyManagerRole.ScopeLevel.COMPANY:
            if normalized_fleet_ids:
                raise ValidationError({"fleet_ids": ["Company-scoped roles cannot receive fleet assignments."]})
            return []

        if not normalized_fleet_ids:
            raise ValidationError({"fleet_ids": ["Fleet-scoped roles require at least one fleet assignment."]})

        for fleet_id in normalized_fleet_ids:
            fleet_company_id = self.fleet_lookup_client.get_fleet_company_id(
                str(fleet_id),
                authorization=authorization,
            )
            if fleet_company_id != normalized_company_id:
                raise ValidationError({"fleet_ids": ["Fleet must belong to the same company."]})
        return normalized_fleet_ids

    def sync_assignments(
        self,
        *,
        manager_account: ManagerAccount,
        fleet_ids: list[uuid.UUID],
    ) -> None:
        desired_ids = {str(fleet_id) for fleet_id in fleet_ids}
        existing = {
            str(assignment.fleet_id): assignment
            for assignment in manager_account.fleet_assignments.all()
        }

        to_delete = [
            assignment.manager_account_fleet_assignment_id
            for fleet_id, assignment in existing.items()
            if fleet_id not in desired_ids
        ]
        if to_delete:
            ManagerAccountFleetAssignment.objects.filter(
                manager_account_fleet_assignment_id__in=to_delete,
            ).delete()

        for fleet_id in fleet_ids:
            if str(fleet_id) in existing:
                continue
            ManagerAccountFleetAssignment.objects.create(
                manager_account=manager_account,
                company_id=manager_account.company_id,
                fleet_id=fleet_id,
            )

    def _normalize_fleet_ids(self, fleet_ids: list[uuid.UUID] | None) -> list[uuid.UUID]:
        if not fleet_ids:
            return []

        seen: set[str] = set()
        normalized: list[uuid.UUID] = []
        for fleet_id in fleet_ids:
            fleet_uuid = uuid.UUID(str(fleet_id))
            fleet_key = str(fleet_uuid)
            if fleet_key in seen:
                continue
            seen.add(fleet_key)
            normalized.append(fleet_uuid)
        return normalized
