try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from datetime import datetime, timedelta
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from driver360.exceptions import UpstreamServiceUnavailable
from driver360.permissions_navigation import require_nav_access
from driver360.permissions import AuthenticatedReadOnly
from driver360.serializers import (
    Driver360SummarySerializer,
    HealthSerializer,
    SettlementCalendarQuerySerializer,
    SettlementCalendarSerializer,
)
from driver360.services.driver_summary_service import DriverSummaryService
from driver360.services.settlement_calendar_service import SettlementCalendarService
from driver360.services.source_clients import SourceServiceError
from driver360.services.work_log_service import WorkLogService


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class Driver360DetailView(APIView):
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(responses={200: Driver360SummarySerializer})
    def get(self, request, driver_ref):
        require_nav_access(request, "drivers")
        summary = DriverSummaryService().build_summary(
            driver_ref=str(driver_ref),
            authorization=request.META.get("HTTP_AUTHORIZATION", ""),
        )
        return Response(Driver360SummarySerializer(summary).data, status=status.HTTP_200_OK)


class DriverWorkLogMeView(APIView):
    def get(self, request):
        # Ensure user is a driver
        if request.user.role != "user":
            return Response({"detail": "Only driver accounts can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        date_to = request.query_params.get("date_to") or datetime.now().strftime("%Y-%m-%d")
        date_from = request.query_params.get("date_from") or (
            datetime.now() - timedelta(days=30)
        ).strftime("%Y-%m-%d")

        result = WorkLogService().list_work_logs(
            driver_account_id=request.user.account_id,
            date_from=date_from,
            date_to=date_to,
            authorization=request.META.get("HTTP_AUTHORIZATION", ""),
        )
        return Response(result, status=status.HTTP_200_OK)


class DriverSettlementCalendarMeView(APIView):
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(responses={200: SettlementCalendarSerializer})
    def get(self, request):
        if request.user.role != "user":
            return Response({"detail": "Only driver accounts can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        default_date_to = request.query_params.get("date_to") or datetime.now().strftime("%Y-%m-%d")
        default_date_from = request.query_params.get("date_from") or (
            datetime.now() - timedelta(days=30)
        ).strftime("%Y-%m-%d")
        query_serializer = SettlementCalendarQuerySerializer(
            data={"date_from": default_date_from, "date_to": default_date_to}
        )
        query_serializer.is_valid(raise_exception=True)

        try:
            result = SettlementCalendarService().get_settlement_calendar(
                driver_account_id=request.user.account_id,
                date_from=query_serializer.validated_data["date_from"].isoformat(),
                date_to=query_serializer.validated_data["date_to"].isoformat(),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc
        return Response(SettlementCalendarSerializer(result).data, status=status.HTTP_200_OK)
