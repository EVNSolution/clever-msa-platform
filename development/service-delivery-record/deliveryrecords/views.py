from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from deliveryrecords.models import DailyDeliveryInputSnapshot, DeliveryRecord
from deliveryrecords.permissions import AdminOnlyAccess
from deliveryrecords.serializers import (
    DailyDeliveryInputSnapshotSerializer,
    DeliveryRecordSerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class DeliveryRecordViewSet(viewsets.ModelViewSet):
    queryset = DeliveryRecord.objects.all()
    serializer_class = DeliveryRecordSerializer
    lookup_field = "delivery_record_id"
    permission_classes = [AdminOnlyAccess]
    http_method_names = ["get", "post", "patch", "head", "options"]


class DailyDeliveryInputSnapshotViewSet(viewsets.ModelViewSet):
    queryset = DailyDeliveryInputSnapshot.objects.all()
    serializer_class = DailyDeliveryInputSnapshotSerializer
    lookup_field = "daily_delivery_input_snapshot_id"
    permission_classes = [AdminOnlyAccess]
    http_method_names = ["get", "post", "patch", "head", "options"]
