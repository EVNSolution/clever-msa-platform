from django.urls import path

from settlementinquiry.views import (
    DriverMessageListCreateView,
    DriverThreadView,
    HealthView,
    OperatorThreadDetailView,
    OperatorThreadListView,
    OperatorThreadMessageListCreateView,
)

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("me/thread/", DriverThreadView.as_view()),
    path("me/messages/", DriverMessageListCreateView.as_view()),
    path("threads/", OperatorThreadListView.as_view()),
    path("threads/<uuid:thread_id>/messages/", OperatorThreadMessageListCreateView.as_view()),
    path("threads/<uuid:thread_id>/", OperatorThreadDetailView.as_view()),
]
