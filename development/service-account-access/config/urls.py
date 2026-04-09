from django.urls import include, path

handler400 = "accounts.error_handlers.bad_request"
handler403 = "accounts.error_handlers.permission_denied"
handler404 = "accounts.error_handlers.page_not_found"
handler500 = "accounts.error_handlers.server_error"

urlpatterns = [
    path("", include("accounts.urls")),
]
