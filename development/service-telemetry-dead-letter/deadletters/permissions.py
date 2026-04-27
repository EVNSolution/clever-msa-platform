from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.permissions import BasePermission

from deadletters.authentication import AuthenticatedProducerPrincipal


class AdminReadPermission(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and getattr(user, "is_authenticated", False)):
            raise NotAuthenticated("Authentication credentials were not provided.")
        if getattr(user, "role", "") != "admin":
            raise PermissionDenied("Admin role required.")
        return True


class ProducerIngestPermission(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and getattr(user, "is_authenticated", False)):
            raise NotAuthenticated("Authentication credentials were not provided.")
        if not isinstance(user, AuthenticatedProducerPrincipal):
            raise PermissionDenied("Producer credentials required.")
        return True
