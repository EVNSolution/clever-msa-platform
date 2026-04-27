from django.utils import timezone

from accounts.models import DriverAccount, IdentityAccountLink, ManagerAccount
from accounts.services.refresh_registry import RefreshRegistry


class ProductAccountLifecycleService:
    def archive_manager_account(
        self,
        manager_account: ManagerAccount,
        *,
        unlink_reason: str = "account_archived",
    ) -> ManagerAccount:
        if manager_account.status == ManagerAccount.Status.ARCHIVED:
            return manager_account

        now = timezone.now()
        manager_account.status = ManagerAccount.Status.ARCHIVED
        manager_account.archived_at = now
        manager_account.save(update_fields=["status", "archived_at"])
        IdentityAccountLink.objects.filter(
            identity=manager_account.identity,
            account_type=IdentityAccountLink.AccountType.MANAGER,
            account_id=manager_account.manager_account_id,
            unlinked_at__isnull=True,
        ).update(unlinked_at=now)
        RefreshRegistry().revoke_account_sessions(str(manager_account.manager_account_id))
        return manager_account

    def archive_driver_account(
        self,
        driver_account: DriverAccount,
        *,
        unlink_reason: str = "account_archived",
    ) -> DriverAccount:
        if driver_account.status == DriverAccount.Status.ARCHIVED:
            return driver_account

        now = timezone.now()
        driver_account.status = DriverAccount.Status.ARCHIVED
        driver_account.archived_at = now
        driver_account.save(update_fields=["status", "archived_at"])
        driver_account.driver_links.filter(unlinked_at__isnull=True).update(
            unlinked_at=now,
            unlink_reason=unlink_reason,
        )
        IdentityAccountLink.objects.filter(
            identity=driver_account.identity,
            account_type=IdentityAccountLink.AccountType.DRIVER,
            account_id=driver_account.driver_account_id,
            unlinked_at__isnull=True,
        ).update(unlinked_at=now)
        RefreshRegistry().revoke_account_sessions(str(driver_account.driver_account_id))
        return driver_account
