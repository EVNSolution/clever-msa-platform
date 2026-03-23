from uuid import UUID

from rest_framework import generics, mixins, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from vehicles.models import VehicleMaster, VehicleOperatorAccess
from vehicles.permissions import AuthenticatedReadAdminWrite
from vehicles.serializers import VehicleMasterSerializer, VehicleOperatorAccessSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class VehicleMasterListCreateView(generics.ListCreateAPIView):
    queryset = VehicleMaster.objects.all()
    serializer_class = VehicleMasterSerializer
    permission_classes = [AuthenticatedReadAdminWrite]


class VehicleMasterDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = VehicleMaster.objects.all()
    serializer_class = VehicleMasterSerializer
    lookup_field = "vehicle_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class VehicleOperatorAccessListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleOperatorAccessSerializer
    permission_classes = [AuthenticatedReadAdminWrite]

    def _parse_uuid_filter(self, value: str, field_name: str):
        try:
            return UUID(value)
        except ValueError as exc:
            raise ValidationError({field_name: ["Must be a valid UUID."]}) from exc

    def get_queryset(self):
        queryset = VehicleOperatorAccess.objects.select_related("vehicle").all()
        vehicle_id = self.request.query_params.get("vehicle_id")
        operator_company_id = self.request.query_params.get("operator_company_id")
        access_status = self.request.query_params.get("access_status")

        if vehicle_id:
            queryset = queryset.filter(
                vehicle_id=self._parse_uuid_filter(vehicle_id, "vehicle_id")
            )
        if operator_company_id:
            queryset = queryset.filter(
                operator_company_id=self._parse_uuid_filter(
                    operator_company_id,
                    "operator_company_id",
                )
            )
        if access_status:
            queryset = queryset.filter(access_status=access_status)
        return queryset


class VehicleOperatorAccessDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = VehicleOperatorAccess.objects.select_related("vehicle").all()
    serializer_class = VehicleOperatorAccessSerializer
    lookup_field = "vehicle_operator_access_id"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
