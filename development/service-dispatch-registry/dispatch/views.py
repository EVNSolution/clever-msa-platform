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

from dispatch.models import DispatchAssignment, DispatchPlan, VehicleSchedule
from dispatch.permissions import AuthenticatedReadAdminWrite
from dispatch.serializers import (
    DispatchAssignmentSerializer,
    DispatchPlanSerializer,
    HealthSerializer,
    VehicleScheduleSerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class DispatchPlanListCreateView(generics.ListCreateAPIView):
    queryset = DispatchPlan.objects.all()
    serializer_class = DispatchPlanSerializer
    permission_classes = [AuthenticatedReadAdminWrite]

    def get_queryset(self):
        queryset = super().get_queryset()
        company_id = self.request.query_params.get("company_id")
        fleet_id = self.request.query_params.get("fleet_id")
        dispatch_date = self.request.query_params.get("dispatch_date")
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        if fleet_id:
            queryset = queryset.filter(fleet_id=fleet_id)
        if dispatch_date:
            queryset = queryset.filter(dispatch_date=dispatch_date)
        return queryset


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

    def get_queryset(self):
        queryset = super().get_queryset()
        fleet_id = self.request.query_params.get("fleet_id")
        dispatch_date = self.request.query_params.get("dispatch_date")
        vehicle_id = self.request.query_params.get("vehicle_id")
        if fleet_id:
            queryset = queryset.filter(fleet_id=fleet_id)
        if dispatch_date:
            queryset = queryset.filter(dispatch_date=dispatch_date)
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        return queryset


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

    def get_queryset(self):
        queryset = super().get_queryset()
        dispatch_date = self.request.query_params.get("dispatch_date")
        assignment_status = self.request.query_params.get("assignment_status")
        vehicle_schedule_id = self.request.query_params.get("vehicle_schedule_id")
        vehicle_id = self.request.query_params.get("vehicle_id")
        driver_id = self.request.query_params.get("driver_id")
        if dispatch_date:
            queryset = queryset.filter(dispatch_date=dispatch_date)
        if assignment_status:
            queryset = queryset.filter(assignment_status=assignment_status)
        if vehicle_schedule_id:
            queryset = queryset.filter(vehicle_schedule_id=vehicle_schedule_id)
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        return queryset


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
