from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from regions.models import Region

DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


class RegionSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = Region
        fields = (
            "region_id",
            "region_code",
            "name",
            "status",
            "difficulty_level",
            "polygon_geojson",
            "description",
            "display_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("region_id", "created_at", "updated_at")

    def validate(self, attrs):
        candidate = self.instance or Region()
        for field, value in attrs.items():
            setattr(candidate, field, value)

        try:
            candidate.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return attrs


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
