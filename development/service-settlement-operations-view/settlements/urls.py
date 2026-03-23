from django.urls import path

from settlements.views import (
    DriverLatestSettlementView,
    HealthView,
    SettlementItemDetailView,
    SettlementItemListView,
    SettlementRunDetailView,
    SettlementRunListView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path(
        "drivers/<uuid:driver_id>/latest-settlement/",
        DriverLatestSettlementView.as_view(),
        name="driver-latest-settlement",
    ),
    path("runs/", SettlementRunListView.as_view(), name="settlement-run-list"),
    path("runs/<uuid:settlement_run_id>/", SettlementRunDetailView.as_view(), name="settlement-run-detail"),
    path("items/", SettlementItemListView.as_view(), name="settlement-item-list"),
    path("items/<uuid:settlement_item_id>/", SettlementItemDetailView.as_view(), name="settlement-item-detail"),
]
