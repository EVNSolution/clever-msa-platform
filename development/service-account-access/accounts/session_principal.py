from dataclasses import dataclass

from accounts.models import DriverAccount, Identity, ManagerAccount, SystemAdminAccount


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
