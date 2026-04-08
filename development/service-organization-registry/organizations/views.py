import uuid

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.models import Company, Fleet
from organizations.permissions_navigation import require_nav_access
from organizations.permissions import AuthenticatedReadAdminWrite
from organizations.serializers import CompanySerializer, FleetSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class PublicRefLookupMixin:
    raw_id_field = ""

    def get_object(self):
        lookup_value = self.kwargs[self.lookup_url_kwarg or self.lookup_field]
        queryset = self.filter_queryset(self.get_queryset())
        filters = Q(**{self.lookup_field: lookup_value})
        if lookup_value.isdigit():
            filters |= Q(route_no=int(lookup_value))
        try:
            filters |= Q(**{self.raw_id_field: uuid.UUID(lookup_value)})
        except ValueError:
            pass

        obj = get_object_or_404(queryset, filters)
        self.check_object_permissions(self.request, obj)
        return obj


class CompanyViewSet(PublicRefLookupMixin, viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    lookup_field = "public_ref"
    lookup_url_kwarg = "company_ref"
    raw_id_field = "company_id"
    permission_classes = [AuthenticatedReadAdminWrite]

    def list(self, request, *args, **kwargs):
        require_nav_access(request, "companies")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        require_nav_access(request, "companies")
        return super().retrieve(request, *args, **kwargs)

    @action(
        detail=False,
        methods=["get"],
        authentication_classes=[],
        permission_classes=[permissions.AllowAny],
        url_path="public",
    )
    def public(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class FleetViewSet(PublicRefLookupMixin, viewsets.ModelViewSet):
    queryset = Fleet.objects.all()
    serializer_class = FleetSerializer
    lookup_field = "public_ref"
    lookup_url_kwarg = "fleet_ref"
    raw_id_field = "fleet_id"
    permission_classes = [AuthenticatedReadAdminWrite]

    def list(self, request, *args, **kwargs):
        require_nav_access(request, "companies")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        require_nav_access(request, "companies")
        return super().retrieve(request, *args, **kwargs)
