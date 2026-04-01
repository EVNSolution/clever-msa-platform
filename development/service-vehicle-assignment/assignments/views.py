import uuid

try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import generics, mixins, permissions
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
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
    lookup_url_kwarg = "assignment_ref"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get_object(self):
        lookup_value = self.kwargs[self.lookup_url_kwarg]
        queryset = self.filter_queryset(self.get_queryset())
        q_parts: list[Q] = []
        if lookup_value.isdigit():
            q_parts.append(Q(route_no=int(lookup_value)))
        try:
            q_parts.append(Q(driver_vehicle_assignment_id=uuid.UUID(lookup_value)))
        except ValueError:
            pass

        if not q_parts:
            raise Http404

        filters = q_parts[0]
        for part in q_parts[1:]:
            filters |= part

        obj = get_object_or_404(queryset, filters)
        self.check_object_permissions(self.request, obj)
        return obj

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
