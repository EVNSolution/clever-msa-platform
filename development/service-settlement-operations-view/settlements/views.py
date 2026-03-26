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
from settlements.permissions import AuthenticatedReadOnly
from settlements.serializers import (
    DriverLatestSettlementSerializer,
    HealthSerializer,
    SettlementItemSerializer,
    SettlementRunSerializer,
)
from settlements.services import (
    LatestSettlementSummaryService,
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

    @extend_schema(responses={200: SettlementRunSerializer(many=True)})
    def get(self, request):
        try:
            runs = SourceClients().list_settlement_runs(
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
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

    @extend_schema(responses={200: SettlementItemSerializer(many=True)})
    def get(self, request):
        try:
            items = SourceClients().list_settlement_items(
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
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
        try:
            latest_settlement = LatestSettlementSummaryService().build_summary(
                driver_id=str(driver_id),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceServiceError as exc:
            raise UpstreamServiceUnavailable() from exc

        payload = {
            "driver_id": str(driver_id),
            "latest_settlement": latest_settlement,
        }
        return Response(
            _serialize_upstream_payload(DriverLatestSettlementSerializer, payload, many=False),
            status=status.HTTP_200_OK,
        )
