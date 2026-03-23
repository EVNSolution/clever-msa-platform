from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.models import Company, Fleet
from organizations.permissions import AuthenticatedReadAdminWrite
from organizations.serializers import CompanySerializer, FleetSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    lookup_field = "company_id"
    permission_classes = [AuthenticatedReadAdminWrite]


class FleetViewSet(viewsets.ModelViewSet):
    queryset = Fleet.objects.all()
    serializer_class = FleetSerializer
    lookup_field = "fleet_id"
    permission_classes = [AuthenticatedReadAdminWrite]
