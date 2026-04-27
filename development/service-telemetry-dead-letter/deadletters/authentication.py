from dataclasses import dataclass

import jwt
from django.conf import settings
from django.utils.crypto import constant_time_compare
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed


@dataclass
class AuthenticatedPrincipal:
    account_id: str
    email: str
    role: str

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False


@dataclass
class AuthenticatedProducerPrincipal:
    source_service: str

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False


class JWTAuthentication(BaseAuthentication):
    def authenticate_header(self, request) -> str:
        return "Bearer"

    def authenticate(self, request):
        try:
            header = get_authorization_header(request).decode("utf-8")
        except UnicodeDecodeError as exc:
            raise AuthenticationFailed("Invalid authorization header.") from exc
        if not header:
            return None

        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed("Invalid authorization header.")

        try:
            payload = jwt.decode(
                parts[1],
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                audience=settings.JWT_AUDIENCE,
                issuer=settings.JWT_ISSUER,
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationFailed("Invalid token.") from exc

        if payload.get("type") != "access":
            raise AuthenticationFailed("Invalid token type.")

        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject:
            raise AuthenticationFailed("Invalid token.")

        principal = AuthenticatedPrincipal(
            account_id=subject,
            email=payload.get("email", ""),
            role=payload.get("role", "user"),
        )
        return principal, payload


class ProducerKeyAuthentication(BaseAuthentication):
    header_name = "X-Telemetry-Dead-Letter-Key"

    def authenticate_header(self, request) -> str:
        return self.header_name

    def authenticate(self, request):
        provided_key = request.headers.get(self.header_name, "")
        if not provided_key:
            return None

        source_service = None
        for producer_source_service, expected_key in settings.TELEMETRY_DEAD_LETTER_PRODUCER_KEYS.items():
            if expected_key and constant_time_compare(provided_key, expected_key):
                source_service = producer_source_service
                break
        if not source_service:
            raise AuthenticationFailed("Invalid producer credentials.")

        principal = AuthenticatedProducerPrincipal(source_service=source_service)
        return principal, {"source_service": source_service}
