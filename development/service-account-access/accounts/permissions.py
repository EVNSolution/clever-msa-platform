from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.permissions import BasePermission


class IsAuthenticatedAccount(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and getattr(user, "is_authenticated", False)):
            raise NotAuthenticated("Authentication credentials were not provided.")
        return True


class IsAdminRole(BasePermission):
    message = "Admin role required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and getattr(user, "is_authenticated", False)):
            raise NotAuthenticated("Authentication credentials were not provided.")
        if user.role != "admin":
            raise PermissionDenied("Admin role required.")
        return True
