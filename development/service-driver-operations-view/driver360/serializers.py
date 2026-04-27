from rest_framework import serializers


class Driver360SummarySerializer(serializers.Serializer):
    driver_id = serializers.UUIDField()
    driver_name = serializers.CharField()
    ev_id = serializers.CharField()
    phone_number = serializers.CharField()
    address = serializers.CharField()
    company_id = serializers.UUIDField()
    company_name = serializers.CharField(allow_null=True)
    fleet_id = serializers.UUIDField()
    fleet_name = serializers.CharField(allow_null=True)
    employment_status = serializers.CharField()
    qualification_status = serializers.CharField()
    driver_account_link_id = serializers.UUIDField(allow_null=True)
    driver_account_id = serializers.UUIDField(allow_null=True)
    driver_account_identity_name = serializers.CharField(allow_null=True)
    driver_account_email = serializers.EmailField(allow_null=True)
    driver_account_status = serializers.CharField(allow_null=True)
    latest_settlement_run_id = serializers.UUIDField(allow_null=True)
    latest_settlement_period_start = serializers.DateField(allow_null=True)
    latest_settlement_period_end = serializers.DateField(allow_null=True)
    latest_settlement_status = serializers.CharField(allow_null=True)
    latest_payout_status = serializers.CharField(allow_null=True)
    latest_settlement_amount = serializers.CharField(allow_null=True)
    driver_cleanup_status = serializers.CharField()
    cleanup_blockers = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    active_personnel_document_types = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    missing_personnel_document_types = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    attendance_rule_status = serializers.CharField()
    delivery_history_rule_status = serializers.CharField()
    warnings = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class SettlementCalendarQuerySerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()

    def validate(self, attrs):
        if attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError({"date_to": ["Must be on or after date_from."]})
        return attrs


class SettlementCalendarSummarySerializer(serializers.Serializer):
    regular_days = serializers.IntegerField(min_value=0)
    special_days = serializers.IntegerField(min_value=0)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class SettlementCalendarResultSerializer(serializers.Serializer):
    service_date = serializers.DateField()
    daily_delivery_input_snapshot_id = serializers.UUIDField()
    settlement_type = serializers.ChoiceField(choices=["regular", "special"])
    box_count = serializers.IntegerField(min_value=0)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class SettlementCalendarSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["linked", "needs_link"])
    driver_id = serializers.UUIDField(required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    summary = SettlementCalendarSummarySerializer(required=False)
    results = SettlementCalendarResultSerializer(many=True)
