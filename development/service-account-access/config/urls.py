from django.contrib import admin
from django.urls import include, path

from rest_framework.permissions import AllowAny

try:
    from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
except ImportError:  # pragma: no cover - optional dependency
    SpectacularAPIView = SpectacularRedocView = SpectacularSwaggerView = None

handler400 = "accounts.error_handlers.bad_request"
handler403 = "accounts.error_handlers.permission_denied"
handler404 = "accounts.error_handlers.page_not_found"
handler500 = "accounts.error_handlers.server_error"

urlpatterns = [
    path("admin/account-access/", admin.site.urls),
    path("", include("accounts.urls")),
]

if SpectacularAPIView is not None:
    urlpatterns += [
        path(
            "openapi.yaml",
            SpectacularAPIView.as_view(permission_classes=[AllowAny]),
            name="openapi-schema",
        ),
        path(
            "swagger/",
            SpectacularSwaggerView.as_view(url_name="openapi-schema"),
            name="swagger-ui",
        ),
        path(
            "redoc/",
            SpectacularRedocView.as_view(url_name="openapi-schema"),
            name="redoc",
        ),
    ]
