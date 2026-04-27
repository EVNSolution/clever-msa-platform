from django.urls import path

from regionanalytics.views import (
    HealthView,
    RegionDailyStatisticDetailView,
    RegionDailyStatisticListCreateView,
    RegionPerformanceSummaryDetailView,
    RegionPerformanceSummaryListCreateView,
)

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("daily-statistics/", RegionDailyStatisticListCreateView.as_view()),
    path(
        "daily-statistics/<uuid:region_daily_statistic_id>/",
        RegionDailyStatisticDetailView.as_view(),
    ),
    path("performance-summaries/", RegionPerformanceSummaryListCreateView.as_view()),
    path(
        "performance-summaries/<uuid:region_performance_summary_id>/",
        RegionPerformanceSummaryDetailView.as_view(),
    ),
]
