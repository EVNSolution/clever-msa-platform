from django.urls import path

from dispatchops.views import BoardView, HealthView, SummaryView


urlpatterns = [
    path("health/", HealthView.as_view(), name="dispatchops-health"),
    path("board/", BoardView.as_view(), name="dispatchops-board"),
    path("summary/", SummaryView.as_view(), name="dispatchops-summary"),
]
