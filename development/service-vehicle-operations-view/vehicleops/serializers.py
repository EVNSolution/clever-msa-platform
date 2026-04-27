from rest_framework import serializers


class VehicleOpsCompanySerializer(serializers.Serializer):
    company_id = serializers.UUIDField(allow_null=True)
    company_name = serializers.CharField(allow_null=True)


class VehicleOpsOperatorCompanySerializer(serializers.Serializer):
    company_id = serializers.UUIDField(allow_null=True)
    company_name = serializers.CharField(allow_null=True)
    access_status = serializers.ChoiceField(
        choices=("active", "suspended", "ended"),
        allow_null=True,
        required=False,
    )


class VehicleOpsAssignmentSerializer(serializers.Serializer):
    driver_vehicle_assignment_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()
    assignment_status = serializers.ChoiceField(choices=("assigned",))
    assigned_at = serializers.DateTimeField(allow_null=True)


class VehicleOpsCurrentTerminalSerializer(serializers.Serializer):
    terminal_id = serializers.UUIDField()
    installation_status = serializers.ChoiceField(choices=("installed", "removed"))
    installed_at = serializers.DateTimeField(allow_null=True)
    imei = serializers.CharField(allow_null=True)
    iccid = serializers.CharField(allow_null=True)
    firmware_version = serializers.CharField(allow_null=True)
    protocol_version = serializers.CharField(allow_null=True)
    app_version = serializers.CharField(allow_null=True)


class VehicleOpsLatestLocationSerializer(serializers.Serializer):
    lat = serializers.FloatField(allow_null=True)
    lng = serializers.FloatField(allow_null=True)
    captured_at = serializers.DateTimeField(allow_null=True)
    snapshot_status = serializers.ChoiceField(
        choices=("fresh", "stale", "unavailable"),
        allow_null=True,
    )


class VehicleOpsLatestDiagnosticSerializer(serializers.Serializer):
    event_code = serializers.CharField(allow_null=True)
    severity = serializers.ChoiceField(
        choices=("info", "warning", "critical"),
        allow_null=True,
    )
    event_status = serializers.ChoiceField(
        choices=("open", "cleared"),
        allow_null=True,
    )
    captured_at = serializers.DateTimeField(allow_null=True)


class VehicleOpsTelemetrySerializer(serializers.Serializer):
    latest_location = VehicleOpsLatestLocationSerializer()
    latest_diagnostic = VehicleOpsLatestDiagnosticSerializer()


class VehicleOpsSummarySerializer(serializers.Serializer):
    WARNING_CODES = (
        "manufacturer_company_name_missing",
        "active_operator_company_name_missing",
        "current_terminal_missing",
        "current_terminal_unavailable",
        "latest_location_missing",
        "latest_diagnostic_missing",
    )

    vehicle_id = serializers.UUIDField()
    route_no = serializers.IntegerField()
    plate_number = serializers.CharField()
    vin = serializers.CharField()
    vehicle_status = serializers.ChoiceField(choices=("active", "inactive", "retired"))
    manufacturer_company = VehicleOpsCompanySerializer()
    active_operator_company = VehicleOpsOperatorCompanySerializer()
    current_assignment = VehicleOpsAssignmentSerializer(allow_null=True)
    current_terminal = VehicleOpsCurrentTerminalSerializer(allow_null=True)
    telemetry = VehicleOpsTelemetrySerializer()
    warnings = serializers.ListField(
        child=serializers.ChoiceField(choices=WARNING_CODES),
        allow_empty=True,
    )


class VehicleOpsVehiclePathSerializer(serializers.Serializer):
    vehicle_ref = serializers.CharField()


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
