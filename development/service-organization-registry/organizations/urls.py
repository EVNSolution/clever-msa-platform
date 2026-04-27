from django.urls import include, path
from rest_framework.routers import SimpleRouter

from organizations.views import CompanyViewSet, FleetViewSet, HealthView

router = SimpleRouter()
router.register("companies", CompanyViewSet, basename="company")
router.register("fleets", FleetViewSet, basename="fleet")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", HealthView.as_view(), name="health"),
]
