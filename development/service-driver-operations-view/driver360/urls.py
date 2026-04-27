from django.urls import path

from driver360.views import Driver360DetailView, DriverSettlementCalendarMeView, DriverWorkLogMeView, HealthView

urlpatterns = [
    path("me/settlement-calendar/", DriverSettlementCalendarMeView.as_view(), name="driver-settlement-calendar-me"),
    path("me/work-logs/", DriverWorkLogMeView.as_view(), name="driver-work-log-me"),
    path("drivers/<str:driver_ref>/", Driver360DetailView.as_view(), name="driver360-detail"),
    path("health/", HealthView.as_view(), name="health"),
]
