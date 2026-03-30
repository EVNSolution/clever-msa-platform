try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from driver360.permissions import AuthenticatedReadOnly
from driver360.serializers import Driver360SummarySerializer, HealthSerializer
from driver360.services.driver_summary_service import DriverSummaryService


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class Driver360DetailView(APIView):
    permission_classes = [AuthenticatedReadOnly]

    @extend_schema(responses={200: Driver360SummarySerializer})
    def get(self, request, driver_ref):
        summary = DriverSummaryService().build_summary(
            driver_ref=str(driver_ref),
            authorization=request.META.get("HTTP_AUTHORIZATION", ""),
        )
        return Response(Driver360SummarySerializer(summary).data, status=status.HTTP_200_OK)
