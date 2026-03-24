from django.urls import path

from settlementregistry.views import HealthView

urlpatterns = [
    path("health/", HealthView.as_view()),
]
