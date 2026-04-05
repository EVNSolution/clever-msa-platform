from rest_framework import serializers


class DispatchOpsQuerySerializer(serializers.Serializer):
    dispatch_date = serializers.DateField()
    fleet_id = serializers.UUIDField()


class DispatchOpsBoardRowSerializer(serializers.Serializer):
    STATUS_CHOICES = (
        "matched",
        "not_started",
        "dispatch_unit_changed",
        "unplanned_current",
    )
    WARNING_CODES = (
        "vehicle_lookup_failed",
        "planned_driver_lookup_failed",
        "planned_outsourced_driver_lookup_failed",
        "current_driver_lookup_failed",
        "current_assignment_source_unavailable",
    )

    dispatch_date = serializers.DateField()
    vehicle_schedule_id = serializers.CharField(allow_null=True, required=False, default=None)
    dispatch_assignment_id = serializers.CharField(allow_null=True, required=False, default=None)
    shift_slot = serializers.CharField(allow_null=True, required=False, default=None)
    vehicle_id = serializers.CharField(allow_null=True)
    plate_number = serializers.CharField(allow_null=True, default=None)
    planned_driver_kind = serializers.CharField(allow_null=True, required=False, default=None)
    outsourced_driver_id = serializers.CharField(allow_null=True, required=False, default=None)
    planned_driver_id = serializers.CharField(allow_null=True, required=False, default=None)
    planned_driver_name = serializers.CharField(allow_null=True, required=False, default=None)
    current_driver_id = serializers.CharField(allow_null=True, required=False, default=None)
    current_driver_name = serializers.CharField(allow_null=True, required=False, default=None)
    dispatch_status = serializers.ChoiceField(choices=STATUS_CHOICES)
    warnings = serializers.ListField(
        child=serializers.ChoiceField(choices=WARNING_CODES),
        allow_empty=True,
    )


class DispatchOpsSummarySerializer(serializers.Serializer):
    dispatch_date = serializers.DateField()
    fleet_id = serializers.UUIDField()
    planned_volume = serializers.IntegerField()
    planned_assignment_count = serializers.IntegerField()
    matched_count = serializers.IntegerField()
    not_started_count = serializers.IntegerField()
    dispatch_unit_changed_count = serializers.IntegerField()
    unplanned_current_count = serializers.IntegerField()


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
