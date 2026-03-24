from django.urls import include, path

from personneldocuments.views import HealthView

urlpatterns = [
    path("documents/", include(([], "personneldocuments"), namespace="documents")),
    path("health/", HealthView.as_view(), name="health"),
]
