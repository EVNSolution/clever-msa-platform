from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from vehicleops.permissions import AuthenticatedReadOnly
from vehicleops.serializers import VehicleOpsSummarySerializer, VehicleOpsVehiclePathSerializer
from vehicleops.services.vehicle_summary_service import VehicleSummaryService


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class VehicleListView(APIView):
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request):
        summaries = VehicleSummaryService().list_summaries(authorization=request.META.get("HTTP_AUTHORIZATION", ""))
        serializer = VehicleOpsSummarySerializer(summaries, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class VehicleDetailView(APIView):
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request, vehicle_id):
        path_serializer = VehicleOpsVehiclePathSerializer(data={"vehicle_id": vehicle_id})
        path_serializer.is_valid(raise_exception=True)
        summary = VehicleSummaryService().build_summary(
            vehicle_id=str(vehicle_id),
            authorization=request.META.get("HTTP_AUTHORIZATION", ""),
        )
        serializer = VehicleOpsSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)
