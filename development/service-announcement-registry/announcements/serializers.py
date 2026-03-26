from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from announcements.models import Announcement

DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


class AnnouncementSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    published_at = serializers.DateTimeField(format=DATETIME_FORMAT, required=False, allow_null=True)
    expires_at = serializers.DateTimeField(format=DATETIME_FORMAT, required=False, allow_null=True)

    class Meta:
        model = Announcement
        fields = (
            "announcement_id",
            "slug",
            "title",
            "body",
            "status",
            "exposure_scope",
            "published_at",
            "expires_at",
            "is_pinned",
            "display_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("announcement_id", "created_at", "updated_at")

    def validate(self, attrs):
        candidate = self.instance or Announcement()
        for field, value in attrs.items():
            setattr(candidate, field, value)

        try:
            candidate.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return attrs


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
