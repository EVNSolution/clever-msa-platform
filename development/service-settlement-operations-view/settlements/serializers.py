from rest_framework import serializers


class SettlementRunSerializer(serializers.Serializer):
    settlement_run_id = serializers.UUIDField()
    company_id = serializers.UUIDField()
    fleet_id = serializers.UUIDField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    status = serializers.CharField()


class SettlementItemSerializer(serializers.Serializer):
    settlement_item_id = serializers.UUIDField()
    settlement_run_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payout_status = serializers.CharField()


class LatestSettlementSummarySerializer(serializers.Serializer):
    settlement_run_id = serializers.UUIDField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    status = serializers.CharField()
    payout_status = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class DriverLatestSettlementSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField()
    delivery_history_present = serializers.BooleanField(allow_null=True)
    attendance_inferred_from_delivery_history = serializers.BooleanField(allow_null=True)
    latest_settlement = LatestSettlementSummarySerializer(allow_null=True)


class DriverLatestSettlementListItemSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField()
    driver_name = serializers.CharField()
    delivery_history_present = serializers.BooleanField(allow_null=True)
    attendance_inferred_from_delivery_history = serializers.BooleanField(allow_null=True)
    latest_settlement = LatestSettlementSummarySerializer(allow_null=True)


class DriverLatestSettlementPageSerializer(serializers.Serializer):
    count = serializers.IntegerField(min_value=0)
    page = serializers.IntegerField(min_value=1)
    page_size = serializers.IntegerField(min_value=1)
    results = DriverLatestSettlementListItemSerializer(many=True)


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
    daily_delivery_input_snapshot_id = serializers.UUIDField()
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
