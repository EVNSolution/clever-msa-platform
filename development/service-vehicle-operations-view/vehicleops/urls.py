from django.urls import path

from vehicleops.views import HealthView, VehicleDetailView, VehicleListView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("vehicles/", VehicleListView.as_view(), name="vehicle-list"),
    path("vehicles/<uuid:vehicle_id>/", VehicleDetailView.as_view(), name="vehicle-detail"),
]
