from django.urls import path

from deadletters.views import (
    HealthView,
    TelemetryDeadLetterDetailView,
    TelemetryDeadLetterIngestView,
    TelemetryDeadLetterListView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("ingest/", TelemetryDeadLetterIngestView.as_view(), name="dead-letter-ingest"),
    path("", TelemetryDeadLetterListView.as_view(), name="dead-letter-list"),
    path(
        "<uuid:telemetry_dead_letter_id>/",
        TelemetryDeadLetterDetailView.as_view(),
        name="dead-letter-detail",
    ),
]
