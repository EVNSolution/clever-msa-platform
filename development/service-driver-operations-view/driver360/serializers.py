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
    account_id = serializers.UUIDField(allow_null=True)
    account_email = serializers.EmailField(allow_null=True)
    account_role = serializers.CharField(allow_null=True)
    account_is_active = serializers.BooleanField(allow_null=True)
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
