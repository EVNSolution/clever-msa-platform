from django.urls import include, path
from rest_framework.routers import SimpleRouter

from personneldocuments.views import HealthView, PersonnelDocumentViewSet

router = SimpleRouter()
router.register("documents", PersonnelDocumentViewSet, basename="personnel-document")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", HealthView.as_view(), name="health"),
]
