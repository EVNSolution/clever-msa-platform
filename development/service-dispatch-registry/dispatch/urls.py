from django.urls import path

from dispatch.views import (
    DispatchAssignmentDetailView,
    DispatchAssignmentListCreateView,
    OutsourcedDriverArchiveView,
    DispatchPlanDetailView,
    DispatchPlanListCreateView,
    DispatchWorkRuleDetailView,
    DispatchWorkRuleListCreateView,
    DriverDayExceptionDetailView,
    DriverDayExceptionListCreateView,
    HealthView,
    OutsourcedDriverDetailView,
    OutsourcedDriverListCreateView,
    VehicleScheduleDetailView,
    VehicleScheduleListCreateView,
)

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("plans/", DispatchPlanListCreateView.as_view()),
    path("plans/<uuid:dispatch_plan_id>/", DispatchPlanDetailView.as_view()),
    path("outsourced-drivers/", OutsourcedDriverListCreateView.as_view()),
    path("outsourced-drivers/<uuid:outsourced_driver_id>/", OutsourcedDriverDetailView.as_view()),
    path(
        "outsourced-drivers/<uuid:outsourced_driver_id>/archive/",
        OutsourcedDriverArchiveView.as_view(),
    ),
    path("work-rules/", DispatchWorkRuleListCreateView.as_view()),
    path("work-rules/<uuid:work_rule_id>/", DispatchWorkRuleDetailView.as_view()),
    path("driver-day-exceptions/", DriverDayExceptionListCreateView.as_view()),
    path(
        "driver-day-exceptions/<uuid:driver_day_exception_id>/",
        DriverDayExceptionDetailView.as_view(),
    ),
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
