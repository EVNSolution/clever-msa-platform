from dataclasses import dataclass

from accounts.models import (
    DriverAccount,
    EmailCredential,
    Identity,
    ManagerAccount,
    SystemAdminAccount,
)


@dataclass
class IdentitySessionPrincipal:
    identity: Identity
    system_admin_account: SystemAdminAccount | None = None
    manager_account: ManagerAccount | None = None
    driver_account: DriverAccount | None = None
    session_kind: str = "normal"

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    @property
    def available_account_types(self) -> list[str]:
        types: list[str] = []
        if self.system_admin_account is not None:
            types.append("system_admin")
        if self.manager_account is not None:
            types.append("manager")
        if self.driver_account is not None:
            types.append("driver")
        return types

    @property
    def is_consent_recovery(self) -> bool:
        return self.session_kind == "consent_recovery"

    @property
    def email(self) -> str:
        credential = (
            EmailCredential.objects.select_related("identity_login_method")
            .filter(
                identity_login_method__identity=self.identity,
                identity_login_method__archived_at__isnull=True,
                identity_login_method__verified_at__isnull=False,
                verified_at__isnull=False,
            )
            .order_by("identity_login_method__identity_login_method_id")
            .first()
        )
        if credential is None:
            return ""
        return credential.email

    @property
    def active_account_type(self) -> str | None:
        if self.system_admin_account is not None:
            return "system_admin"
        if self.manager_account is not None:
            return "manager"
        if self.driver_account is not None:
            return "driver"
        return None

    @property
    def active_account(self):
        if self.system_admin_account is not None:
            return self.system_admin_account
        if self.manager_account is not None:
            return self.manager_account
        if self.driver_account is not None:
            return self.driver_account
        return None

    @property
    def active_account_id(self) -> str | None:
        active_account = self.active_account
        if active_account is None:
            return None
        if self.system_admin_account is not None:
            return str(self.system_admin_account.system_admin_account_id)
        if self.manager_account is not None:
            return str(self.manager_account.manager_account_id)
        if self.driver_account is not None:
            return str(self.driver_account.driver_account_id)
        return None

    @property
    def company_id(self) -> str | None:
        active_account = self.active_account
        if active_account is None or not hasattr(active_account, "company_id"):
            return None
        return str(active_account.company_id)

    @property
    def role(self) -> str:
        if self.system_admin_account is not None or self.manager_account is not None:
            return "admin"
        if self.driver_account is not None:
            return "user"
        return ""

    @property
    def role_type(self) -> str | None:
        if self.system_admin_account is not None:
            return "system_admin"
        if self.manager_account is not None:
            return self.manager_account.role_type
        if self.driver_account is not None:
            return "driver"
        return None

    @property
    def account_id(self) -> str:
        return self.active_account_id or str(self.identity.identity_id)

    @classmethod
    def from_identity(
        cls,
        identity: Identity,
        *,
        session_kind: str = "normal",
    ) -> "IdentitySessionPrincipal":
        return cls(
            identity=identity,
            system_admin_account=SystemAdminAccount.objects.filter(
                identity=identity,
                status=SystemAdminAccount.Status.ACTIVE,
            ).first(),
            manager_account=ManagerAccount.objects.filter(
                identity=identity,
                status=ManagerAccount.Status.ACTIVE,
            ).first(),
            driver_account=DriverAccount.objects.filter(
                identity=identity,
                status=DriverAccount.Status.ACTIVE,
            ).first(),
            session_kind=session_kind,
        )
