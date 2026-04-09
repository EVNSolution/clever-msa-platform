try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import generics, mixins, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary
from regionanalytics.permissions_navigation import require_nav_access
from regionanalytics.permissions import AdminOnlyAccess
from regionanalytics.serializers import (
    HealthSerializer,
    RegionDailyStatisticSerializer,
    RegionPerformanceSummarySerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class RegionDailyStatisticListCreateView(generics.ListCreateAPIView):
    serializer_class = RegionDailyStatisticSerializer
    permission_classes = [AdminOnlyAccess]

    def get_queryset(self):
        if self.request.method == "GET":
            require_nav_access(self.request, "regions")
        queryset = RegionDailyStatistic.objects.all()

        region_id = self.request.query_params.get("region_id")
        if region_id:
            queryset = queryset.filter(region_id=region_id)

        region_code_snapshot = self.request.query_params.get("region_code_snapshot")
        if region_code_snapshot:
            queryset = queryset.filter(region_code_snapshot=region_code_snapshot)

        service_date = self.request.query_params.get("service_date")
        if service_date:
            queryset = queryset.filter(service_date=service_date)

        return queryset


class RegionDailyStatisticDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = RegionDailyStatistic.objects.all()
    serializer_class = RegionDailyStatisticSerializer
    lookup_field = "region_daily_statistic_id"
    permission_classes = [AdminOnlyAccess]
    http_method_names = ["get", "patch", "options", "head"]

    def get_queryset(self):
        if self.request.method == "GET":
            require_nav_access(self.request, "regions")
        return super().get_queryset()

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class RegionPerformanceSummaryListCreateView(generics.ListCreateAPIView):
    serializer_class = RegionPerformanceSummarySerializer
    permission_classes = [AdminOnlyAccess]

    def get_queryset(self):
        if self.request.method == "GET":
            require_nav_access(self.request, "regions")
        queryset = RegionPerformanceSummary.objects.all()

        region_id = self.request.query_params.get("region_id")
        if region_id:
            queryset = queryset.filter(region_id=region_id)

        region_code_snapshot = self.request.query_params.get("region_code_snapshot")
        if region_code_snapshot:
            queryset = queryset.filter(region_code_snapshot=region_code_snapshot)

        period_start = self.request.query_params.get("period_start")
        if period_start:
            queryset = queryset.filter(period_start=period_start)

        period_end = self.request.query_params.get("period_end")
        if period_end:
            queryset = queryset.filter(period_end=period_end)

        difficulty_level_snapshot = self.request.query_params.get("difficulty_level_snapshot")
        if difficulty_level_snapshot:
            queryset = queryset.filter(difficulty_level_snapshot=difficulty_level_snapshot)

        return queryset


class RegionPerformanceSummaryDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = RegionPerformanceSummary.objects.all()
    serializer_class = RegionPerformanceSummarySerializer
    lookup_field = "region_performance_summary_id"
    permission_classes = [AdminOnlyAccess]
    http_method_names = ["get", "patch", "options", "head"]

    def get_queryset(self):
        if self.request.method == "GET":
            require_nav_access(self.request, "regions")
        return super().get_queryset()

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
