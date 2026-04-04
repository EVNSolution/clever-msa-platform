from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import DriverAccount, Identity, PasswordCredential


class IdentityLifecycleService:
    def archive_identity(self, identity: Identity) -> Identity:
        now = timezone.now()
        with transaction.atomic():
            identity.status = Identity.Status.ARCHIVED
            identity.archived_at = now
            identity.save(update_fields=["status", "archived_at"])

            identity.system_admin_accounts.filter(status="active").update(
                status="archived",
                archived_at=now,
            )
            identity.manager_accounts.filter(status="active").update(
                status="archived",
                archived_at=now,
            )
            active_driver_accounts = list(identity.driver_accounts.filter(status="active"))
            identity.driver_accounts.filter(status="active").update(
                status="archived",
                archived_at=now,
            )
            for driver_account in active_driver_accounts:
                driver_account.driver_links.filter(unlinked_at__isnull=True).update(
                    unlinked_at=now,
                    unlink_reason="identity_archived",
                )

            identity.login_methods.all().delete()
            PasswordCredential.objects.filter(identity=identity).delete()
        return identity

    def recover_identity(self, identity: Identity) -> Identity:
        identity.status = Identity.Status.ACTIVE
        identity.archived_at = None
        identity.save(update_fields=["status", "archived_at"])
        return identity

    def validate_last_method_deletion(self, identity: Identity, *, confirm: bool, current_password: str | None):
        if not confirm:
            raise ValidationError({"confirm": ["Final confirmation is required."]})
        password_credential = PasswordCredential.objects.filter(identity=identity).first()
        if password_credential is None or not current_password:
            raise ValidationError({"current_password": ["Current password is required."]})
        if not check_password(current_password, password_credential.password_hash):
            raise ValidationError({"current_password": ["Current password is incorrect."]})
