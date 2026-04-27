from django.urls import include, path
from rest_framework.routers import SimpleRouter

from settlements.views import DriverDailySettlementView, HealthView, SettlementItemViewSet, SettlementRunViewSet

router = SimpleRouter()
router.register("runs", SettlementRunViewSet, basename="settlement-run")
router.register("items", SettlementItemViewSet, basename="settlement-item")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "drivers/<uuid:driver_id>/daily-settlements/",
        DriverDailySettlementView.as_view(),
        name="driver-daily-settlements",
    ),
    path("health/", HealthView.as_view(), name="health"),
]
