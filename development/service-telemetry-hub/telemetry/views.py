from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from telemetry.models import DiagnosticEvent, VehicleLocationSnapshot
from telemetry.permissions import AuthenticatedReadAdminOrIngestKeyWrite, AuthenticatedReadAdminWrite
from telemetry.serializers import (
    DiagnosticEventSerializer,
    RawIngestSerializer,
    TelemetryRawIngestResponseSerializer,
    VehicleLocationSnapshotSerializer,
)
from telemetry.services.ingest_service import IngestService


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class RawIngestView(APIView):
    permission_classes = [AuthenticatedReadAdminOrIngestKeyWrite]

    def post(self, request):
        serializer = RawIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = IngestService().ingest_raw(serializer.validated_data)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        response_serializer = TelemetryRawIngestResponseSerializer(result.raw_ingest)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class VehicleLatestLocationView(APIView):
    permission_classes = [AuthenticatedReadAdminWrite]

    def get(self, request, vehicle_id):
        snapshot = get_object_or_404(VehicleLocationSnapshot, vehicle_id=vehicle_id)
        return Response(VehicleLocationSnapshotSerializer(snapshot).data)


class TerminalLatestLocationView(APIView):
    permission_classes = [AuthenticatedReadAdminWrite]

    def get(self, request, terminal_id):
        snapshot = get_object_or_404(VehicleLocationSnapshot, terminal_id=terminal_id)
        return Response(VehicleLocationSnapshotSerializer(snapshot).data)


class VehicleLatestDiagnosticsView(APIView):
    permission_classes = [AuthenticatedReadAdminWrite]

    def get(self, request, vehicle_id):
        diagnostics = DiagnosticEvent.objects.filter(vehicle_id=vehicle_id).order_by("-captured_at")
        return Response(DiagnosticEventSerializer(diagnostics, many=True).data)
