from rest_framework import serializers

from dispatch.models import DispatchAssignment, DispatchPlan, VehicleSchedule
from dispatch.services.dispatch_rule_service import DispatchRuleService, DispatchRuleViolation

DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def _merged_attributes(instance, attrs):
    if instance is None:
        return dict(attrs)
    merged = {}
    for field in instance._meta.fields:
        if field.auto_created:
            continue
        merged[field.name] = getattr(instance, field.name)
    merged.update(attrs)
    return merged


def _validate_model_instance(model_cls, attrs, *, instance=None):
    merged = _merged_attributes(instance, attrs)
    if instance is None:
        candidate = model_cls(**merged)
    else:
        candidate = instance
        for key, value in merged.items():
            setattr(candidate, key, value)
    candidate.full_clean()
    return attrs


class DispatchPlanSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = DispatchPlan
        fields = (
            "dispatch_plan_id",
            "company_id",
            "fleet_id",
            "dispatch_date",
            "planned_volume",
            "dispatch_status",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        try:
            return _validate_model_instance(DispatchPlan, attrs, instance=self.instance)
        except Exception as exc:
            if isinstance(exc, serializers.ValidationError):
                raise
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class VehicleScheduleSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = VehicleSchedule
        fields = (
            "vehicle_schedule_id",
            "vehicle_id",
            "fleet_id",
            "dispatch_date",
            "shift_slot",
            "schedule_status",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        try:
            return _validate_model_instance(VehicleSchedule, attrs, instance=self.instance)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class DispatchAssignmentSerializer(serializers.ModelSerializer):
    vehicle_schedule_id = serializers.PrimaryKeyRelatedField(
        queryset=VehicleSchedule.objects.all(),
        source="vehicle_schedule",
    )
    assigned_at = serializers.DateTimeField(format=DATETIME_FORMAT)
    unassigned_at = serializers.DateTimeField(
        format=DATETIME_FORMAT,
        allow_null=True,
        required=False,
    )
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = DispatchAssignment
        fields = (
            "dispatch_assignment_id",
            "vehicle_schedule_id",
            "vehicle_id",
            "driver_id",
            "operator_company_id",
            "dispatch_date",
            "shift_slot",
            "assignment_status",
            "assigned_at",
            "unassigned_at",
            "created_at",
            "updated_at",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["vehicle_schedule_id"] = str(instance.vehicle_schedule_id)
        return data

    def validate(self, attrs):
        request = self.context.get("request")
        authorization = request.headers.get("Authorization", "") if request else ""
        try:
            attrs = DispatchRuleService().validate_and_normalize(
                attributes=attrs,
                authorization=authorization,
                instance=self.instance,
            )
            return _validate_model_instance(DispatchAssignment, attrs, instance=self.instance)
        except DispatchRuleViolation as exc:
            raise serializers.ValidationError(exc.details) from exc
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise
