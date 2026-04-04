from django.contrib.auth.hashers import check_password
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import EmailCredential, Identity, PasswordCredential
from accounts.services.identity_consent_service import IdentityConsentService
from accounts.session_principal import IdentitySessionPrincipal


class IdentityAuthService:
    def authenticate_email_password(self, *, email: str, password: str) -> IdentitySessionPrincipal:
        email_credential = (
            EmailCredential.objects.select_related("identity_login_method__identity")
            .filter(email=email)
            .first()
        )
        if email_credential is None:
            raise AuthenticationFailed("Invalid email or password.")

        login_method = email_credential.identity_login_method
        identity = login_method.identity
        if login_method.archived_at is not None or login_method.verified_at is None:
            raise AuthenticationFailed("Invalid email or password.")
        if identity.status != Identity.Status.ACTIVE:
            raise AuthenticationFailed("Identity is archived.")

        password_credential = PasswordCredential.objects.filter(identity=identity).first()
        if password_credential is None or not check_password(password, password_credential.password_hash):
            raise AuthenticationFailed("Invalid email or password.")

        session_kind = (
            "normal"
            if IdentityConsentService().is_fully_consented(identity)
            else "consent_recovery"
        )
        return IdentitySessionPrincipal.from_identity(identity, session_kind=session_kind)
