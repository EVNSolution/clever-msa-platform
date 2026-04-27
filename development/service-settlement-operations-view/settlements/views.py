try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from settlements.exceptions import UpstreamInvalidResponse, UpstreamServiceUnavailable
from settlements.permissions_navigation import require_nav_access
from settlements.permissions import AuthenticatedReadOnly
from settlements.serializers import (
    DriverDailySettlementQuerySerializer,
    DriverDailySettlementSerializer,
    DriverLatestSettlementSerializer,
    DriverLatestSettlementPageSerializer,
    HealthSerializer,
    SettlementItemSerializer,
    SettlementRunSerializer,
)
from settlements.services import (
    DailySettlementReadService,
    LatestSettlementSummaryService,
    PagedLatestSettlementSummaryService,
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


def _serialize_upstream_payload(serializer_class, payload, *, many: bool):
    serializer = serializer_class(data=payload, many=many)
    if not serializer.is_valid():
        raise UpstreamInvalidResponse(errors=serializer.errors)
    return serializer.data


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class SettlementRunListView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(
        responses={200: SettlementRunSerializer(many=True)},
        parameters=[
            {"name": "company_id", "required": False, "in": "query", "schema": {"type": "string"}},
            {"name": "fleet_id", "required": False, "in": "query", "schema": {"type": "string"}},
        ],
    )
    def get(self, request):
        require_nav_access(request, "settlements")
        try:
            runs = SourceClients().list_settlement_runs(
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
                company_id=request.query_params.get("company_id"),
                fleet_id=request.query_params.get("fleet_id"),
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        return Response(
            _serialize_upstream_payload(SettlementRunSerializer, runs, many=True),
            status=status.HTTP_200_OK,
        )


class SettlementRunDetailView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(responses={200: SettlementRunSerializer})
    def get(self, request, settlement_run_id):
        require_nav_access(request, "settlements")
        try:
            run = SourceClients().get_settlement_run(
                settlement_run_id=str(settlement_run_id),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceNotFoundError as exc:
            raise NotFound("Settlement run not found.") from exc
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        return Response(
            _serialize_upstream_payload(SettlementRunSerializer, run, many=False),
            status=status.HTTP_200_OK,
        )


class SettlementItemListView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(
        responses={200: SettlementItemSerializer(many=True)},
        parameters=[
            {"name": "company_id", "required": False, "in": "query", "schema": {"type": "string"}},
            {"name": "fleet_id", "required": False, "in": "query", "schema": {"type": "string"}},
        ],
    )
    def get(self, request):
        require_nav_access(request, "settlements")
        try:
            items = SourceClients().list_settlement_items(
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
                company_id=request.query_params.get("company_id"),
                fleet_id=request.query_params.get("fleet_id"),
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        return Response(
            _serialize_upstream_payload(SettlementItemSerializer, items, many=True),
            status=status.HTTP_200_OK,
        )


class SettlementItemDetailView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(responses={200: SettlementItemSerializer})
    def get(self, request, settlement_item_id):
        require_nav_access(request, "settlements")
        try:
            item = SourceClients().get_settlement_item(
                settlement_item_id=str(settlement_item_id),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceNotFoundError as exc:
            raise NotFound("Settlement item not found.") from exc
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        return Response(
            _serialize_upstream_payload(SettlementItemSerializer, item, many=False),
            status=status.HTTP_200_OK,
        )


class DriverLatestSettlementView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(responses={200: DriverLatestSettlementSerializer})
    def get(self, request, driver_id):
        require_nav_access(request, "settlements")
        try:
            latest_settlement = LatestSettlementSummaryService().build_summary(
                driver_id=str(driver_id),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        payload = {"driver_id": str(driver_id), **latest_settlement}
        return Response(
            _serialize_upstream_payload(DriverLatestSettlementSerializer, payload, many=False),
            status=status.HTTP_200_OK,
        )


class DriverLatestSettlementPageView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(
        responses={200: DriverLatestSettlementPageSerializer},
        parameters=[
            {"name": "company_id", "required": False, "in": "query", "schema": {"type": "string"}},
            {"name": "fleet_id", "required": False, "in": "query", "schema": {"type": "string"}},
            {"name": "page", "required": False, "in": "query", "schema": {"type": "integer", "default": 1}},
            {"name": "page_size", "required": False, "in": "query", "schema": {"type": "integer", "default": 10}},
        ],
    )
    def get(self, request):
        require_nav_access(request, "settlements")
        page = int(request.query_params.get("page", "1"))
        page_size = int(request.query_params.get("page_size", "10"))
        try:
            payload = PagedLatestSettlementSummaryService().build_page(
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
                company_id=request.query_params.get("company_id"),
                fleet_id=request.query_params.get("fleet_id"),
                page=page,
                page_size=page_size,
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        return Response(
            _serialize_upstream_payload(DriverLatestSettlementPageSerializer, payload, many=False),
            status=status.HTTP_200_OK,
        )


class DriverDailySettlementView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(
        responses={200: DriverDailySettlementSerializer},
        parameters=[
            {"name": "date_from", "required": True, "in": "query", "schema": {"type": "string", "format": "date"}},
            {"name": "date_to", "required": True, "in": "query", "schema": {"type": "string", "format": "date"}},
        ],
    )
    def get(self, request, driver_id):
        require_nav_access(request, "settlements")
        query_serializer = DriverDailySettlementQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        try:
            payload = DailySettlementReadService().build_daily_settlements(
                driver_id=str(driver_id),
                date_from=query_serializer.validated_data["date_from"].isoformat(),
                date_to=query_serializer.validated_data["date_to"].isoformat(),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        return Response(
            _serialize_upstream_payload(DriverDailySettlementSerializer, payload, many=False),
            status=status.HTTP_200_OK,
        )
