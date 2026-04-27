import uuid
from uuid import UUID

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

from rest_framework import generics, mixins, permissions
from django.db.models import Q
from django.http import Http404
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from vehicles.models import VehicleMaster, VehicleOperatorAccess
from vehicles.permissions_navigation import require_nav_access
from vehicles.permissions import AuthenticatedReadAdminWrite
from vehicles.serializers import (
    HealthSerializer,
    VehicleMasterSerializer,
    VehicleOperatorAccessFilterSerializer,
    VehicleOperatorAccessSerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class VehicleMasterListCreateView(generics.ListCreateAPIView):
    queryset = VehicleMaster.objects.all()
    serializer_class = VehicleMasterSerializer
    permission_classes = [AuthenticatedReadAdminWrite]

    def get(self, request, *args, **kwargs):
        require_nav_access(request, "vehicles")
        return super().get(request, *args, **kwargs)


class VehicleMasterDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = VehicleMaster.objects.all()
    serializer_class = VehicleMasterSerializer
    lookup_field = "vehicle_id"
    lookup_url_kwarg = "vehicle_ref"
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "patch", "options", "head"]

    def get_object(self):
        lookup_value = self.kwargs[self.lookup_url_kwarg]
        queryset = self.filter_queryset(self.get_queryset())
        q_parts: list[Q] = []
        if lookup_value.isdigit():
            q_parts.append(Q(route_no=int(lookup_value)))
        try:
            q_parts.append(Q(vehicle_id=uuid.UUID(lookup_value)))
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
        require_nav_access(request, "vehicles")
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


@extend_schema_view(get=extend_schema(parameters=[VehicleOperatorAccessFilterSerializer]))
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

    def get(self, request, *args, **kwargs):
        require_nav_access(request, "vehicles")
        return super().get(request, *args, **kwargs)


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
        require_nav_access(request, "vehicles")
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
