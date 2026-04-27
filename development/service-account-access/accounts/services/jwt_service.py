from datetime import datetime, timezone
from uuid import uuid4

import jwt
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

from accounts.services.navigation_policy_service import NavigationPolicyService


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _identity_payload(principal, token_type: str, lifetime):
    now = _utcnow()
    principal_kind = (
        "identity_consent_recovery_session"
        if getattr(principal, "session_kind", "normal") == "consent_recovery"
        else "identity_session"
    )
    payload = {
        "sub": principal.account_id,
        "principal_kind": principal_kind,
        "identity_id": str(principal.identity.identity_id),
        "email": principal.email,
        "role": principal.role,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
        "jti": str(uuid4()),
        "type": token_type,
    }
    if principal.active_account_id is not None:
        payload["active_account_id"] = principal.active_account_id
        payload["active_account_type"] = principal.active_account_type
    if principal.company_id is not None:
        payload["company_id"] = principal.company_id
    if principal.role_type is not None:
        payload["role_type"] = principal.role_type
    if getattr(principal, "role_scope_level", None) is not None:
        payload["role_scope_level"] = principal.role_scope_level
        payload["assigned_fleet_ids"] = principal.assigned_fleet_ids
        payload["scope_ui_mode"] = principal.scope_ui_mode
        payload["default_fleet_id"] = principal.default_fleet_id
    if token_type == "access":
        policy = NavigationPolicyService().get_allowed_nav_keys_for_principal(principal)
        payload["allowed_nav_keys"] = policy["allowed_nav_keys"]
        payload["navigation_policy_source"] = policy["source"]
    return payload


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
