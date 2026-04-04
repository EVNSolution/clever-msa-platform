from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import DriverAccount, DriverAccountLink
from accounts.services.driver_profile_company_lookup_client import DriverProfileCompanyLookupClient


class DriverAccountLinkService:
    def list_manageable_driver_accounts(self, principal):
        queryset = (
            DriverAccount.objects.select_related("identity")
            .filter(status=DriverAccount.Status.ACTIVE, identity__status="active")
            .order_by("identity__name", "driver_account_id")
        )

        if getattr(principal, "system_admin_account", None) is not None:
            return queryset

        manager_account = getattr(principal, "manager_account", None)
        if manager_account is None:
            raise PermissionDenied("Driver account management is not allowed for this account.")
        return queryset.filter(company_id=manager_account.company_id)

    def list_manageable_links(self, principal):
        queryset = (
            DriverAccountLink.objects.select_related("driver_account__identity")
            .order_by("-linked_at")
        )
        if getattr(principal, "system_admin_account", None) is not None:
            return queryset

        manager_account = getattr(principal, "manager_account", None)
        if manager_account is None:
            raise PermissionDenied("Driver account management is not allowed for this account.")
        return queryset.filter(driver_account__company_id=manager_account.company_id)

    def get_manageable_link(self, principal, link_id):
        queryset = self.list_manageable_links(principal)
        return get_object_or_404(queryset, driver_account_link_id=link_id)

    def create_link(self, principal, *, driver_account_id: str, driver_id: str) -> DriverAccountLink:
        driver_account = get_object_or_404(
            self.list_manageable_driver_accounts(principal),
            driver_account_id=driver_account_id,
        )
        if DriverAccountLink.objects.filter(driver_account=driver_account, unlinked_at__isnull=True).exists():
            raise ValidationError({"driver_account_id": ["Driver account is already linked."]})
        if DriverAccountLink.objects.filter(driver_id=driver_id, unlinked_at__isnull=True).exists():
            raise ValidationError({"driver_id": ["Driver is already linked to another account."]})

        driver_company_id = DriverProfileCompanyLookupClient().get_driver_company_id(driver_id)
        if str(driver_company_id) != str(driver_account.company_id):
            raise ValidationError({"driver_id": ["Driver and driver account must belong to the same company."]})

        return DriverAccountLink.objects.create(
            driver_account=driver_account,
            driver_id=driver_id,
        )

    def unlink(self, principal, link: DriverAccountLink) -> DriverAccountLink:
        if link.unlinked_at is not None:
            raise ValidationError({"status": ["Driver account link is already inactive."]})
        link.unlinked_at = timezone.now()
        link.unlink_reason = "admin_unlinked"
        link.save(update_fields=["unlinked_at", "unlink_reason"])
        return link
