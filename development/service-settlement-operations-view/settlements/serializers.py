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
