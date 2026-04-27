"""Serializers for settlement payroll resources."""

from rest_framework import serializers

from settlements.models import SettlementItem, SettlementRun


class SettlementRunSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = SettlementRun
        fields = (
            "settlement_run_id",
            "company_id",
            "fleet_id",
            "period_start",
            "period_end",
            "status",
            "items",
        )

    def get_items(self, instance):
        return SettlementItemSerializer(instance.items.all(), many=True).data


class SettlementItemSerializer(serializers.ModelSerializer):
    settlement_run_id = serializers.PrimaryKeyRelatedField(
        source="settlement_run",
        queryset=SettlementRun.objects.all(),
        pk_field=serializers.UUIDField(),
    )

    class Meta:
        model = SettlementItem
        fields = (
            "settlement_item_id",
            "settlement_run_id",
            "driver_id",
            "amount",
            "payout_status",
        )


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class DriverDailySettlementQuerySerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()

    def validate(self, attrs):
        if attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError({"date_to": ["Must be on or after date_from."]})
        return attrs


class DriverDailySettlementSummarySerializer(serializers.Serializer):
    regular_days = serializers.IntegerField(min_value=0)
    special_days = serializers.IntegerField(min_value=0)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class DriverDailySettlementResultSerializer(serializers.Serializer):
    service_date = serializers.DateField()
    settlement_type = serializers.ChoiceField(choices=["regular", "special"])
    box_count = serializers.IntegerField(min_value=0)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class DriverDailySettlementSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField()
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    summary = DriverDailySettlementSummarySerializer()
    results = DriverDailySettlementResultSerializer(many=True)
