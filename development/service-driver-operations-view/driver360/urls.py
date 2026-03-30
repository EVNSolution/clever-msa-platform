from django.urls import path

from driver360.views import Driver360DetailView, HealthView

urlpatterns = [
    path("drivers/<str:driver_ref>/", Driver360DetailView.as_view(), name="driver360-detail"),
    path("health/", HealthView.as_view(), name="health"),
]
