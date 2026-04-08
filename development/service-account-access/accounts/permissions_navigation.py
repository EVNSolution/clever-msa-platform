from rest_framework.exceptions import PermissionDenied

from accounts.services.navigation_policy_service import NavigationPolicyService


def _get_allowed_nav_keys(request) -> set[str]:
    auth_payload = getattr(request, "auth", None)
    if isinstance(auth_payload, dict) and "allowed_nav_keys" in auth_payload:
        return set(auth_payload.get("allowed_nav_keys") or [])

    policy = NavigationPolicyService().get_allowed_nav_keys_for_principal(request.user)
    return set(policy["allowed_nav_keys"])


def require_nav_access(request, nav_item_key: str, action: str = "view") -> None:
    if action != "view":
        raise PermissionDenied("Unsupported navigation policy action.")

    principal = request.user
    if getattr(principal, "system_admin_account", None) is not None:
        return
    if getattr(principal, "manager_account", None) is None:
        raise PermissionDenied("This API is not allowed by current navigation policy.")

    if nav_item_key not in _get_allowed_nav_keys(request):
        raise PermissionDenied("This API is not allowed by current navigation policy.")
