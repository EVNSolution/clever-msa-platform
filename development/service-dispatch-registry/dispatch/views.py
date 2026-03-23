from rest_framework import generics, mixins, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from dispatch.models import DispatchAssignment, DispatchPlan, VehicleSchedule
from dispatch.permissions import AuthenticatedReadAdminWrite
from dispatch.serializers import (
    DispatchAssignmentSerializer,
    DispatchPlanSerializer,
    VehicleScheduleSerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class DispatchPlanListCreateView(generics.ListCreateAPIView):
    queryset = DispatchPlan.objects.all()
    serializer_class = DispatchPlanSerializer
    permission_classes = [AuthenticatedReadAdminWrite]


class DispatchPlanDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = DispatchPlan.objects.all()
    serializer_class = DispatchPlanSerializer
    lookup_field = "dispatch_plan_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class VehicleScheduleListCreateView(generics.ListCreateAPIView):
    queryset = VehicleSchedule.objects.all()
    serializer_class = VehicleScheduleSerializer
    permission_classes = [AuthenticatedReadAdminWrite]


class VehicleScheduleDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = VehicleSchedule.objects.all()
    serializer_class = VehicleScheduleSerializer
    lookup_field = "vehicle_schedule_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class DispatchAssignmentListCreateView(generics.ListCreateAPIView):
    queryset = DispatchAssignment.objects.all()
    serializer_class = DispatchAssignmentSerializer
    permission_classes = [AuthenticatedReadAdminWrite]


class DispatchAssignmentDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = DispatchAssignment.objects.all()
    serializer_class = DispatchAssignmentSerializer
    lookup_field = "dispatch_assignment_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
