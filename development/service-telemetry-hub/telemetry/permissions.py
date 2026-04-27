from django.conf import settings
from django.utils.crypto import constant_time_compare
from rest_framework.permissions import BasePermission, SAFE_METHODS


class AuthenticatedReadAdminWrite(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(user, "role", "") == "admin"


class AuthenticatedReadAdminOrIngestKeyWrite(AuthenticatedReadAdminWrite):
    def has_permission(self, request, view) -> bool:
        if request.method not in SAFE_METHODS:
            expected_key = getattr(settings, "TELEMETRY_HUB_INGEST_KEY", "")
            provided_key = request.headers.get("X-Telemetry-Ingest-Key", "")
            if expected_key and constant_time_compare(provided_key, expected_key):
                return True
        return super().has_permission(request, view)
