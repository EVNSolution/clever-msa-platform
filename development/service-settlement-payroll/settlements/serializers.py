"""Serializers for settlement payroll resources."""

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
