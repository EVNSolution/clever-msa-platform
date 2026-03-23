from django.urls import path

from dispatch.views import (
    DispatchAssignmentDetailView,
    DispatchAssignmentListCreateView,
    DispatchPlanDetailView,
    DispatchPlanListCreateView,
    HealthView,
    VehicleScheduleDetailView,
    VehicleScheduleListCreateView,
)

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("plans/", DispatchPlanListCreateView.as_view()),
    path("plans/<uuid:dispatch_plan_id>/", DispatchPlanDetailView.as_view()),
    path("vehicle-schedules/", VehicleScheduleListCreateView.as_view()),
    path(
        "vehicle-schedules/<uuid:vehicle_schedule_id>/",
        VehicleScheduleDetailView.as_view(),
    ),
    path("assignments/", DispatchAssignmentListCreateView.as_view()),
    path(
        "assignments/<uuid:dispatch_assignment_id>/",
        DispatchAssignmentDetailView.as_view(),
    ),
]
