from django.urls import include, path
from rest_framework.routers import SimpleRouter

from settlements.views import HealthView, SettlementItemViewSet, SettlementRunViewSet

router = SimpleRouter()
router.register("runs", SettlementRunViewSet, basename="settlement-run")
router.register("items", SettlementItemViewSet, basename="settlement-item")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", HealthView.as_view(), name="health"),
]
