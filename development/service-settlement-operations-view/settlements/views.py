from rest_framework import permissions, status
from rest_framework.exceptions import APIException, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from settlements.permissions import AuthenticatedReadOnly
from settlements.serializers import SettlementItemSerializer, SettlementRunSerializer
from settlements.services import SourceClients, SourceNotFoundError, SourceServiceError


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class SettlementRunListView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request):
        try:
            runs = SourceClients().list_settlement_runs(
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceServiceError as exc:
            raise APIException("Settlement payroll service is unavailable.") from exc

        serializer = SettlementRunSerializer(runs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettlementRunDetailView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request, settlement_run_id):
        try:
            run = SourceClients().get_settlement_run(
                settlement_run_id=str(settlement_run_id),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceNotFoundError as exc:
            raise NotFound("Settlement run not found.") from exc
        except SourceServiceError as exc:
            raise APIException("Settlement payroll service is unavailable.") from exc

        serializer = SettlementRunSerializer(run)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettlementItemListView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request):
        try:
            items = SourceClients().list_settlement_items(
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceServiceError as exc:
            raise APIException("Settlement payroll service is unavailable.") from exc

        serializer = SettlementItemSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettlementItemDetailView(APIView):
    http_method_names = ["get", "head", "options"]
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request, settlement_item_id):
        try:
            item = SourceClients().get_settlement_item(
                settlement_item_id=str(settlement_item_id),
                authorization=request.META.get("HTTP_AUTHORIZATION", ""),
            )
        except SourceNotFoundError as exc:
            raise NotFound("Settlement item not found.") from exc
        except SourceServiceError as exc:
            raise APIException("Settlement payroll service is unavailable.") from exc

        serializer = SettlementItemSerializer(item)
        return Response(serializer.data, status=status.HTTP_200_OK)
