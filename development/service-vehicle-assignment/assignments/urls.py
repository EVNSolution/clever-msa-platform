from django.urls import path

from assignments.views import AssignmentDetailView, AssignmentListCreateView, HealthView

urlpatterns = [
    path("assignments/", AssignmentListCreateView.as_view(), name="assignment-list"),
    path(
        "assignments/<uuid:driver_vehicle_assignment_id>/",
        AssignmentDetailView.as_view(),
        name="assignment-detail",
    ),
    path("health/", HealthView.as_view(), name="health"),
]
