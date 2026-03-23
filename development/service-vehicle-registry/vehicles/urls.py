from django.urls import path

from vehicles.views import (
    HealthView,
    VehicleMasterDetailView,
    VehicleMasterListCreateView,
    VehicleOperatorAccessDetailView,
    VehicleOperatorAccessListCreateView,
)

urlpatterns = [
    path("vehicle-masters/", VehicleMasterListCreateView.as_view(), name="vehicle-master-list"),
    path(
        "vehicle-masters/<uuid:vehicle_id>/",
        VehicleMasterDetailView.as_view(),
        name="vehicle-master-detail",
    ),
    path(
        "vehicle-operator-accesses/",
        VehicleOperatorAccessListCreateView.as_view(),
        name="vehicle-operator-access-list",
    ),
    path(
        "vehicle-operator-accesses/<uuid:vehicle_operator_access_id>/",
        VehicleOperatorAccessDetailView.as_view(),
        name="vehicle-operator-access-detail",
    ),
    path("health/", HealthView.as_view(), name="health"),
]
