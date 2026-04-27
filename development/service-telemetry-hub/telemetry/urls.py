from django.urls import path

from telemetry.views import (
    HealthView,
    RawIngestView,
    TerminalLatestLocationView,
    VehicleLatestDiagnosticsView,
    VehicleLatestLocationView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("ingest/raw/", RawIngestView.as_view(), name="raw-ingest"),
    path(
        "vehicles/<uuid:vehicle_id>/latest-location/",
        VehicleLatestLocationView.as_view(),
        name="vehicle-latest-location",
    ),
    path(
        "vehicles/<uuid:vehicle_id>/latest-diagnostics/",
        VehicleLatestDiagnosticsView.as_view(),
        name="vehicle-latest-diagnostics",
    ),
    path(
        "terminals/<uuid:terminal_id>/latest-location/",
        TerminalLatestLocationView.as_view(),
        name="terminal-latest-location",
    ),
]
