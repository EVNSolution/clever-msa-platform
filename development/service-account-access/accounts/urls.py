from django.urls import path

from accounts.views import (
    AccountDetailView,
    AccountDriverLinkView,
    AccountListCreateView,
    ChangePasswordView,
    HealthView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("account-driver-links/", AccountDriverLinkView.as_view(), name="account-driver-link"),
    path("accounts/", AccountListCreateView.as_view(), name="account-list"),
    path("accounts/<str:account_ref>/", AccountDetailView.as_view(), name="account-detail"),
    path("health/", HealthView.as_view(), name="health"),
]
