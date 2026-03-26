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

from regions.models import Region
from regions.permissions import AdminOnlyAccess
from regions.serializers import HealthSerializer, RegionSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class RegionListCreateView(generics.ListCreateAPIView):
    serializer_class = RegionSerializer
    permission_classes = [AdminOnlyAccess]

    def get_queryset(self):
        queryset = Region.objects.all()

        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        difficulty_level = self.request.query_params.get("difficulty_level")
        if difficulty_level:
            queryset = queryset.filter(difficulty_level=difficulty_level)

        region_code = self.request.query_params.get("region_code")
        if region_code:
            queryset = queryset.filter(region_code=region_code)

        return queryset


class RegionDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    lookup_field = "region_id"
    permission_classes = [AdminOnlyAccess]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
