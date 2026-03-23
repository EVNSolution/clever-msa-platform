from django.urls import path

from driver360.views import Driver360DetailView, HealthView

urlpatterns = [
    path("drivers/<uuid:driver_id>/", Driver360DetailView.as_view(), name="driver360-detail"),
    path("health/", HealthView.as_view(), name="health"),
]
