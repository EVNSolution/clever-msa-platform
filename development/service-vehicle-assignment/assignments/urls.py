from django.urls import path

from assignments.views import AssignmentDetailView, AssignmentListCreateView, HealthView

urlpatterns = [
    path("assignments/", AssignmentListCreateView.as_view(), name="assignment-list"),
    path(
        "assignments/<str:assignment_ref>/",
        AssignmentDetailView.as_view(),
        name="assignment-detail",
    ),
    path("health/", HealthView.as_view(), name="health"),
]
