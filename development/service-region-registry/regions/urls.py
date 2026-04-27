from django.urls import path

from regions.views import HealthView, RegionDetailView, RegionListCreateView

urlpatterns = [
    path("", RegionListCreateView.as_view()),
    path("<uuid:region_id>/", RegionDetailView.as_view()),
    path("health/", HealthView.as_view()),
]
