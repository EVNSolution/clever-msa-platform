from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from regionanalytics.models import RegionDailyStatistic, RegionPerformanceSummary

DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


class RegionDailyStatisticSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = RegionDailyStatistic
        fields = (
            "region_daily_statistic_id",
            "region_id",
            "region_code_snapshot",
            "service_date",
            "delivery_count",
            "completed_delivery_count",
            "exception_delivery_count",
            "total_distance_km",
            "total_base_amount",
            "average_delivery_minutes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("region_daily_statistic_id", "created_at", "updated_at")

    def validate(self, attrs):
        candidate = self.instance or RegionDailyStatistic()
        for field, value in attrs.items():
            setattr(candidate, field, value)

        try:
            candidate.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return attrs


class RegionPerformanceSummarySerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = RegionPerformanceSummary
        fields = (
            "region_performance_summary_id",
            "region_id",
            "region_code_snapshot",
            "difficulty_level_snapshot",
            "period_start",
            "period_end",
            "delivery_count",
            "completion_rate",
            "productivity_score",
            "cost_per_delivery",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("region_performance_summary_id", "created_at", "updated_at")

    def validate(self, attrs):
        candidate = self.instance or RegionPerformanceSummary()
        for field, value in attrs.items():
            setattr(candidate, field, value)

        try:
            candidate.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return attrs


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
