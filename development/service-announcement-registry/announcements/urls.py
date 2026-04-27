from django.urls import path

from announcements.views import AnnouncementDetailView, AnnouncementListCreateView, HealthView

urlpatterns = [
    path("", AnnouncementListCreateView.as_view()),
    path("<uuid:announcement_id>/", AnnouncementDetailView.as_view()),
    path("health/", HealthView.as_view()),
]
