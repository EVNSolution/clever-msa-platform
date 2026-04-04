import secrets

from django.contrib.auth.hashers import make_password

from accounts.models import Account, EmailCredential, Identity, ManagerAccount, PasswordCredential


class LegacyAccountProjectionService:
    def sync_identity(self, identity: Identity) -> Account | None:
        account = Account.objects.filter(identity=identity).first()
        role = self._resolve_role(identity)
        email = self._resolve_email(identity)
        password_credential = PasswordCredential.objects.filter(identity=identity).first()

        if (
            identity.status != Identity.Status.ACTIVE
            or role is None
            or email is None
            or password_credential is None
        ):
            if account is not None:
                self._scrub(account)
            return account

        account = self._get_or_create_account(identity=identity, email=email)
        account.identity = identity
        account.email = email
        account.password_hash = password_credential.password_hash
        account.role = role
        account.is_active = True
        account.save()
        return account

    def _get_or_create_account(self, *, identity: Identity, email: str) -> Account:
        account = Account.objects.filter(identity=identity).first()
        if account is not None:
            return account

        reusable = Account.objects.filter(identity__isnull=True, email=email).first()
        if reusable is not None:
            return reusable

        return Account(
            identity=identity,
            email=email,
            password_hash=make_password(secrets.token_urlsafe(32)),
            role=Account.Role.USER,
            is_active=False,
        )

    def _resolve_role(self, identity: Identity) -> str | None:
        if identity.system_admin_accounts.filter(status="active").exists():
            return Account.Role.ADMIN

        manager_account = identity.manager_accounts.filter(status="active").first()
        if manager_account is None:
            return None

        # Phase 1 keeps the legacy web consoles on /auth/*, so any active manager
        # account must project to the legacy admin role until the fronts switch to
        # identity/account-native authorization.
        return Account.Role.ADMIN

    def _resolve_email(self, identity: Identity) -> str | None:
        credential = (
            EmailCredential.objects.select_related("identity_login_method")
            .filter(
                identity_login_method__identity=identity,
                identity_login_method__archived_at__isnull=True,
                identity_login_method__verified_at__isnull=False,
                verified_at__isnull=False,
            )
            .order_by("identity_login_method__identity_login_method_id")
            .first()
        )
        if credential is None:
            return None
        return credential.email

    def _scrub(self, account: Account) -> None:
        account.email = f"archived+{account.account_id}@archived.local"
        account.password_hash = make_password(secrets.token_urlsafe(32))
        account.is_active = False
        account.save(update_fields=["email", "password_hash", "is_active"])
