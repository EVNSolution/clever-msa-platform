from django.urls import path

from vehicleops.views import HealthView, VehicleDetailView, VehicleListView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("vehicles/", VehicleListView.as_view(), name="vehicle-list"),
    path("vehicles/<str:vehicle_ref>/", VehicleDetailView.as_view(), name="vehicle-detail"),
]
