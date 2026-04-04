from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import Account, Identity
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
        if payload.get("principal_kind") == "identity_session":
            identity = Identity.objects.filter(
                identity_id=payload["sub"],
                status=Identity.Status.ACTIVE,
            ).first()
            if identity is None:
                raise AuthenticationFailed("Identity not found.")
            return IdentitySessionPrincipal.from_identity(identity), payload

        account = Account.objects.filter(account_id=payload["sub"], is_active=True).first()
        if account is None:
            raise AuthenticationFailed("Account not found.")
        return account, payload
