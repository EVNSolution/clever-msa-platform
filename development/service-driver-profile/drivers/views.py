from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from drivers.models import DriverProfile
from drivers.permissions import AuthenticatedReadWrite
from drivers.serializers import DriverProfileSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class DriverListCreateView(generics.ListCreateAPIView):
    queryset = DriverProfile.objects.all()
    serializer_class = DriverProfileSerializer
    permission_classes = [AuthenticatedReadWrite]


class DriverDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DriverProfile.objects.all()
    serializer_class = DriverProfileSerializer
    lookup_field = "driver_id"
    permission_classes = [AuthenticatedReadWrite]


class CheckEvIdView(APIView):
    permission_classes = [AuthenticatedReadWrite]

    def get(self, request):
        company_id = request.query_params.get("company_id")
        ev_id = request.query_params.get("ev_id")
        if not company_id or not ev_id:
            return Response(
                {"code": "invalid_request", "message": "company_id and ev_id are required.", "details": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_duplicate = DriverProfile.objects.filter(company_id=company_id, ev_id=ev_id).exists()
        return Response({"is_duplicate": is_duplicate})
