"""Read/write endpoints for placeholder settlement runs and items."""

from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from settlements.models import SettlementItem, SettlementRun
from settlements.permissions import AuthenticatedReadAdminWrite
from settlements.serializers import SettlementItemSerializer, SettlementRunSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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
