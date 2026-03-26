try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import generics, mixins, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from terminals.models import TerminalInstallation, TerminalRegistry
from terminals.permissions import AuthenticatedReadAdminWrite
from terminals.serializers import (
    CheckImeiQuerySerializer,
    CheckImeiResultSerializer,
    HealthSerializer,
    TerminalInstallationSerializer,
    TerminalRegistrySerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class CheckImeiView(APIView):
    permission_classes = [AuthenticatedReadAdminWrite]

    @extend_schema(
        parameters=[CheckImeiQuerySerializer],
        responses={200: CheckImeiResultSerializer},
    )
    def get(self, request):
        imei = request.query_params.get("imei", "").strip()
        return Response({"imei": imei, "exists": TerminalRegistry.objects.filter(imei=imei).exists()})


class TerminalRegistryListCreateView(generics.ListCreateAPIView):
    queryset = TerminalRegistry.objects.all()
    serializer_class = TerminalRegistrySerializer
    permission_classes = [AuthenticatedReadAdminWrite]


class TerminalRegistryDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = TerminalRegistry.objects.all()
    serializer_class = TerminalRegistrySerializer
    lookup_field = "terminal_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class TerminalInstallationListCreateView(generics.ListCreateAPIView):
    queryset = TerminalInstallation.objects.select_related("terminal").all()
    serializer_class = TerminalInstallationSerializer
    permission_classes = [AuthenticatedReadAdminWrite]


class TerminalInstallationDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = TerminalInstallation.objects.select_related("terminal").all()
    serializer_class = TerminalInstallationSerializer
    lookup_field = "terminal_installation_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
