from django.urls import path

from terminals.views import (
    CheckImeiView,
    HealthView,
    TerminalInstallationDetailView,
    TerminalInstallationListCreateView,
    TerminalRegistryDetailView,
    TerminalRegistryListCreateView,
)

urlpatterns = [
    path("", TerminalRegistryListCreateView.as_view(), name="terminal-list"),
    path("check-imei/", CheckImeiView.as_view(), name="terminal-check-imei"),
    path(
        "<uuid:terminal_id>/",
        TerminalRegistryDetailView.as_view(),
        name="terminal-detail",
    ),
    path(
        "installations/",
        TerminalInstallationListCreateView.as_view(),
        name="terminal-installation-list",
    ),
    path(
        "installations/<uuid:terminal_installation_id>/",
        TerminalInstallationDetailView.as_view(),
        name="terminal-installation-detail",
    ),
    path("health/", HealthView.as_view(), name="health"),
]
