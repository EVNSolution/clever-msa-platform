try:
    from drf_spectacular.utils import extend_schema, extend_schema_view
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

    def extend_schema_view(**kwargs):
        def decorator(target):
            return target

        return decorator

from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from deadletters.authentication import JWTAuthentication, ProducerKeyAuthentication
from deadletters.models import TelemetryDeadLetter
from deadletters.permissions import AdminReadPermission, ProducerIngestPermission
from deadletters.serializers import (
    HealthSerializer,
    TelemetryDeadLetterFilterSerializer,
    TelemetryDeadLetterSerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class TelemetryDeadLetterIngestView(generics.CreateAPIView):
    authentication_classes = [ProducerKeyAuthentication]
    permission_classes = [ProducerIngestPermission]
    serializer_class = TelemetryDeadLetterSerializer
    queryset = TelemetryDeadLetter.objects.all()


@extend_schema_view(get=extend_schema(parameters=[TelemetryDeadLetterFilterSerializer]))
class TelemetryDeadLetterListView(generics.ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AdminReadPermission]
    serializer_class = TelemetryDeadLetterSerializer

    def get_queryset(self):
        queryset = TelemetryDeadLetter.objects.all()
        failure_class = self.request.query_params.get("failure_class")
        source_service = self.request.query_params.get("source_service")
        failed_at_from = self.request.query_params.get("failed_at_from")
        failed_at_to = self.request.query_params.get("failed_at_to")

        if failure_class:
            queryset = queryset.filter(failure_class=failure_class)
        if source_service:
            queryset = queryset.filter(source_service=source_service)

        parsed_failed_at_from = parse_datetime(failed_at_from) if failed_at_from else None
        parsed_failed_at_to = parse_datetime(failed_at_to) if failed_at_to else None
        if parsed_failed_at_from:
            queryset = queryset.filter(failed_at__gte=parsed_failed_at_from)
        if parsed_failed_at_to:
            queryset = queryset.filter(failed_at__lte=parsed_failed_at_to)

        return queryset


class TelemetryDeadLetterDetailView(generics.RetrieveAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AdminReadPermission]
    serializer_class = TelemetryDeadLetterSerializer
    queryset = TelemetryDeadLetter.objects.all()
    lookup_field = "telemetry_dead_letter_id"
