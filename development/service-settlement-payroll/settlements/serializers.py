"""Serializers for the settlement placeholder scaffold."""

from rest_framework import serializers

from settlements.models import SettlementItem, SettlementRun


class SettlementRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = SettlementRun
        fields = (
            "settlement_run_id",
            "company_id",
            "fleet_id",
            "period_start",
            "period_end",
            "status",
        )


class SettlementItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SettlementItem
        fields = (
            "settlement_item_id",
            "settlement_run_id",
            "driver_id",
            "amount",
            "payout_status",
        )

    def validate_settlement_run_id(self, value):
        if not SettlementRun.objects.filter(settlement_run_id=value).exists():
            raise serializers.ValidationError("Referenced settlement run does not exist.")
        return value
