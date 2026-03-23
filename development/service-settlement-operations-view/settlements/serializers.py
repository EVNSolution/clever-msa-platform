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
    latest_settlement = LatestSettlementSummarySerializer(allow_null=True)
