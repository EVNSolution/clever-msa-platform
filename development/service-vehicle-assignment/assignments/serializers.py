from datetime import timezone

from rest_framework import serializers

from assignments.models import DriverVehicleAssignment
from assignments.services.assignment_rule_service import (
    AssignmentRuleService,
    AssignmentRuleViolation,
)


class DriverVehicleAssignmentSerializer(serializers.ModelSerializer):
    assigned_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
    )
    unassigned_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
        allow_null=True,
        required=False,
    )
    created_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
        read_only=True,
    )
    updated_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
        read_only=True,
    )

    class Meta:
        model = DriverVehicleAssignment
        fields = (
            "driver_vehicle_assignment_id",
            "driver_id",
            "vehicle_id",
            "operator_company_id",
            "assignment_status",
            "assigned_at",
            "unassigned_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        authorization = request.headers.get("Authorization", "") if request else ""
        try:
            return AssignmentRuleService().validate_and_normalize(
                attributes=attrs,
                authorization=authorization,
                instance=self.instance,
            )
        except AssignmentRuleViolation as exc:
            raise serializers.ValidationError(exc.details) from exc


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
