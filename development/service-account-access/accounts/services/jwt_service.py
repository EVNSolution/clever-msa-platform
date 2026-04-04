from datetime import datetime, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _base_payload(account, token_type: str, lifetime):
    now = _utcnow()
    return {
        "sub": str(account.account_id),
        "email": account.email,
        "role": account.role,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
        "jti": str(uuid4()),
        "type": token_type,
    }


def create_access_token(account) -> str:
    payload = _base_payload(account, "access", settings.ACCESS_TOKEN_LIFETIME)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(account) -> str:
    payload = _base_payload(account, "refresh", settings.REFRESH_TOKEN_LIFETIME)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _identity_payload(principal, token_type: str, lifetime):
    now = _utcnow()
    principal_kind = (
        "identity_consent_recovery_session"
        if getattr(principal, "session_kind", "normal") == "consent_recovery"
        else "identity_session"
    )
    return {
        "sub": str(principal.identity.identity_id),
        "principal_kind": principal_kind,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
        "jti": str(uuid4()),
        "type": token_type,
    }


def create_identity_access_token(principal) -> str:
    payload = _identity_payload(principal, "access", settings.ACCESS_TOKEN_LIFETIME)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_identity_refresh_token(principal) -> str:
    payload = _identity_payload(principal, "refresh", settings.REFRESH_TOKEN_LIFETIME)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
        )
    except jwt.PyJWTError as exc:
        raise AuthenticationFailed("Invalid token.") from exc

    if payload.get("type") != expected_type:
        raise AuthenticationFailed("Invalid token type.")
    return payload
