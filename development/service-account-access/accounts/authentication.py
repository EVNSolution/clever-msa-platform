from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import Identity
from accounts.services.identity_consent_service import IdentityConsentService
from accounts.session_principal import IdentitySessionPrincipal
from accounts.services.jwt_service import decode_token


class JWTAuthentication(BaseAuthentication):
    def authenticate_header(self, request) -> str:
        return "Bearer"

    def authenticate(self, request):
        header = get_authorization_header(request).decode("utf-8")
        if not header:
            return None

        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed("Invalid authorization header.")

        payload = decode_token(parts[1], "access")
        principal_kind = payload.get("principal_kind")
        if principal_kind not in {"identity_session", "identity_consent_recovery_session"}:
            raise AuthenticationFailed("Identity session is required.")

        identity = Identity.objects.filter(
            identity_id=payload.get("identity_id", payload["sub"]),
            status=Identity.Status.ACTIVE,
        ).first()
        if identity is None:
            raise AuthenticationFailed("Identity not found.")
        session_kind = (
            "consent_recovery"
            if principal_kind == "identity_consent_recovery_session"
            or not IdentityConsentService().is_fully_consented(identity)
            else "normal"
        )
        principal = IdentitySessionPrincipal.from_identity(identity, session_kind=session_kind)
        payload_account_id = payload.get("active_account_id")
        if payload_account_id and principal.active_account_id != payload_account_id:
            raise AuthenticationFailed("Session is no longer active.")
        return principal, payload
