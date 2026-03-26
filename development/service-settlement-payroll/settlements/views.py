"""Read/write endpoints for settlement payroll runs and items."""

try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from settlements.models import SettlementItem, SettlementRun
from settlements.permissions import AuthenticatedReadAdminWrite
from settlements.serializers import HealthSerializer, SettlementItemSerializer, SettlementRunSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class SettlementRunViewSet(viewsets.ModelViewSet):
    queryset = SettlementRun.objects.all()
    serializer_class = SettlementRunSerializer
    lookup_field = "settlement_run_id"
    permission_classes = [AuthenticatedReadAdminWrite]


class SettlementItemViewSet(viewsets.ModelViewSet):
    queryset = SettlementItem.objects.all()
    serializer_class = SettlementItemSerializer
    lookup_field = "settlement_item_id"
    permission_classes = [AuthenticatedReadAdminWrite]
