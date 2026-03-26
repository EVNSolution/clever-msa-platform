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

from assignments.models import DriverVehicleAssignment
from assignments.permissions import AuthenticatedReadAdminWrite
from assignments.serializers import DriverVehicleAssignmentSerializer, HealthSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class AssignmentListCreateView(generics.ListCreateAPIView):
    queryset = DriverVehicleAssignment.objects.all()
    serializer_class = DriverVehicleAssignmentSerializer
    permission_classes = [AuthenticatedReadAdminWrite]


class AssignmentDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = DriverVehicleAssignment.objects.all()
    serializer_class = DriverVehicleAssignmentSerializer
    lookup_field = "driver_vehicle_assignment_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
