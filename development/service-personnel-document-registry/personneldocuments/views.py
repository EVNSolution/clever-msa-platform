try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
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
