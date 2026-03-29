try:
    from drf_spectacular.utils import OpenApiParameter, extend_schema
except ModuleNotFoundError:
    OpenApiParameter = None

    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import viewsets
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from personneldocuments.models import PersonnelDocument
from personneldocuments.permissions import AdminOnlyAccess
from personneldocuments.serializers import HealthSerializer, PersonnelDocumentSerializer


LIST_PARAMETERS = []
if OpenApiParameter is not None:
    LIST_PARAMETERS = [
        OpenApiParameter(
            name="driver_id",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Optional driver-scoped filter.",
        )
    ]


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class PersonnelDocumentViewSet(viewsets.ModelViewSet):
    queryset = PersonnelDocument.objects.all()
    serializer_class = PersonnelDocumentSerializer
    lookup_field = "personnel_document_id"
    permission_classes = [AdminOnlyAccess]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        driver_id = self.request.query_params.get("driver_id")
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        return queryset

    @extend_schema(parameters=LIST_PARAMETERS)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
