from django.urls import path

from drivers.views import CheckEvIdView, DriverDetailView, DriverListCreateView, HealthView

urlpatterns = [
    path("", DriverListCreateView.as_view(), name="driver-list"),
    path("check-ev-id/", CheckEvIdView.as_view(), name="driver-check-ev-id"),
    path("<uuid:driver_id>/", DriverDetailView.as_view(), name="driver-detail"),
    path("health/", HealthView.as_view(), name="health"),
]
