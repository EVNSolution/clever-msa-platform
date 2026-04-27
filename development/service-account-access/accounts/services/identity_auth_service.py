from django.contrib.auth.hashers import check_password
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import EmailCredential, Identity, PasswordCredential, PhoneCredential, SocialCredential
from accounts.services.identity_consent_service import IdentityConsentService
from accounts.services.social_provider_service import SocialProviderService
from accounts.session_principal import IdentitySessionPrincipal


class IdentityAuthService:
    def authenticate_email_password(self, *, email: str, password: str) -> IdentitySessionPrincipal:
        return self.authenticate_identifier_password(identifier=email, password=password)

    def authenticate_identifier_password(
        self,
        *,
        identifier: str,
        password: str,
    ) -> IdentitySessionPrincipal:
        identifier = identifier.strip()
        if "@" in identifier:
            credential = (
                EmailCredential.objects.select_related("identity_login_method__identity")
                .filter(email=identifier)
                .first()
            )
        else:
            credential = (
                PhoneCredential.objects.select_related("identity_login_method__identity")
                .filter(phone_number=identifier)
                .first()
            )

        if credential is None:
            raise AuthenticationFailed("Invalid email or password.")

        login_method = credential.identity_login_method
        identity = login_method.identity
        if login_method.archived_at is not None or login_method.verified_at is None:
            raise AuthenticationFailed("Invalid email or password.")
        if getattr(credential, "verified_at", None) is None:
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

    def authenticate_social(self, *, provider_type: str, access_token: str) -> IdentitySessionPrincipal:
        social_identity = SocialProviderService().resolve_subject(
            provider_type=provider_type,
            access_token=access_token,
        )
        return self.authenticate_social_subject(
            provider_type=social_identity["provider_type"],
            provider_subject=social_identity["provider_subject"],
        )

    def authenticate_social_subject(
        self,
        *,
        provider_type: str,
        provider_subject: str,
    ) -> IdentitySessionPrincipal:
        social_credential = (
            SocialCredential.objects.select_related("identity_login_method__identity")
            .filter(
                provider_type=provider_type,
                provider_subject=provider_subject,
            )
            .first()
        )
        if social_credential is None:
            raise AuthenticationFailed("Social account is not connected.")

        login_method = social_credential.identity_login_method
        identity = login_method.identity
        if (
            login_method.archived_at is not None
            or login_method.verified_at is None
            or social_credential.verified_at is None
        ):
            raise AuthenticationFailed("Social account is not available.")
        if identity.status != Identity.Status.ACTIVE:
            raise AuthenticationFailed("Identity is archived.")

        session_kind = (
            "normal"
            if IdentityConsentService().is_fully_consented(identity)
            else "consent_recovery"
        )
        return IdentitySessionPrincipal.from_identity(identity, session_kind=session_kind)
