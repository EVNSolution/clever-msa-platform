from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from telemetry.models import DiagnosticEvent, VehicleLocationSnapshot
from telemetry.permissions import AuthenticatedReadAdminOrIngestKeyWrite, AuthenticatedReadAdminWrite
from telemetry.serializers import (
    DiagnosticEventSerializer,
    HealthSerializer,
    RawIngestSerializer,
    TelemetryRawIngestResponseSerializer,
    VehicleLocationSnapshotSerializer,
)
from telemetry.services.ingest_service import IngestService


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class RawIngestView(APIView):
    permission_classes = [AuthenticatedReadAdminOrIngestKeyWrite]

    @extend_schema(request=RawIngestSerializer, responses={201: TelemetryRawIngestResponseSerializer})
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

    @extend_schema(responses={200: VehicleLocationSnapshotSerializer})
    def get(self, request, vehicle_id):
        snapshot = get_object_or_404(VehicleLocationSnapshot, vehicle_id=vehicle_id)
        return Response(VehicleLocationSnapshotSerializer(snapshot).data)


class TerminalLatestLocationView(APIView):
    permission_classes = [AuthenticatedReadAdminWrite]

    @extend_schema(responses={200: VehicleLocationSnapshotSerializer})
    def get(self, request, terminal_id):
        snapshot = get_object_or_404(VehicleLocationSnapshot, terminal_id=terminal_id)
        return Response(VehicleLocationSnapshotSerializer(snapshot).data)


class VehicleLatestDiagnosticsView(APIView):
    permission_classes = [AuthenticatedReadAdminWrite]

    @extend_schema(responses={200: DiagnosticEventSerializer(many=True)})
    def get(self, request, vehicle_id):
        diagnostics = DiagnosticEvent.objects.filter(vehicle_id=vehicle_id).order_by("-captured_at")
        return Response(DiagnosticEventSerializer(diagnostics, many=True).data)
