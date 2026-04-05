try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from rest_framework import generics, mixins, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from announcements.models import Announcement
from announcements.permissions import AdminOnlyAccess, AuthenticatedAnnouncementAccess, is_admin
from announcements.serializers import AnnouncementSerializer, HealthSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class AnnouncementListCreateView(generics.ListCreateAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [AuthenticatedAnnouncementAccess]

    def get_queryset(self):
        queryset = Announcement.objects.all()
        user = self.request.user

        if not is_admin(user):
            queryset = queryset.filter(
                status=Announcement.Status.PUBLISHED,
                exposure_scope__in=(
                    Announcement.ExposureScope.ALL,
                    Announcement.ExposureScope.OPERATOR,
                ),
            )

        status_value = self.request.query_params.get("status")
        if status_value and is_admin(user):
            queryset = queryset.filter(status=status_value)

        exposure_scope = self.request.query_params.get("exposure_scope")
        if exposure_scope and is_admin(user):
            queryset = queryset.filter(exposure_scope=exposure_scope)

        slug = self.request.query_params.get("slug")
        if slug:
            queryset = queryset.filter(slug=slug)

        return queryset

    def post(self, request, *args, **kwargs):
        if not is_admin(request.user):
            raise PermissionDenied("Admin role required.")
        return super().post(request, *args, **kwargs)


class AnnouncementDetailView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    generics.GenericAPIView,
):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    lookup_field = "announcement_id"
    permission_classes = [AdminOnlyAccess]
    http_method_names = ["get", "patch", "options", "head"]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
