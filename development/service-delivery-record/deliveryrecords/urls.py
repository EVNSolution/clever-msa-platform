from django.urls import path

from deliveryrecords.views import HealthView

urlpatterns = [
    path("health/", HealthView.as_view()),
]
