from datetime import timezone

from rest_framework import serializers

from vehicles.models import VehicleMaster, VehicleOperatorAccess


class VehicleMasterSerializer(serializers.ModelSerializer):
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
        model = VehicleMaster
        fields = (
            "vehicle_id",
            "route_no",
            "manufacturer_company_id",
            "plate_number",
            "vin",
            "manufacturer_vehicle_code",
            "model_name",
            "vehicle_status",
            "created_at",
            "updated_at",
        )


class VehicleOperatorAccessSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=VehicleMaster.objects.all(),
        source="vehicle",
    )
    started_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
    )
    ended_at = serializers.DateTimeField(
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
        model = VehicleOperatorAccess
        fields = (
            "vehicle_operator_access_id",
            "vehicle_id",
            "operator_company_id",
            "access_status",
            "started_at",
            "ended_at",
            "created_at",
            "updated_at",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["vehicle_id"] = str(instance.vehicle_id)
        return data

    def validate(self, attrs):
        vehicle = attrs.get("vehicle", getattr(self.instance, "vehicle", None))
        access_status = attrs.get(
            "access_status",
            getattr(self.instance, "access_status", None),
        )
        queryset = VehicleOperatorAccess.objects.filter(
            vehicle=vehicle,
            access_status=VehicleOperatorAccess.AccessStatus.ACTIVE,
        )
        if self.instance is not None:
            queryset = queryset.exclude(
                vehicle_operator_access_id=self.instance.vehicle_operator_access_id
            )
        if (
            vehicle is not None
            and access_status == VehicleOperatorAccess.AccessStatus.ACTIVE
            and queryset.exists()
        ):
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "A vehicle may have at most one active operator access."
                    ]
                }
            )
        return attrs


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class VehicleOperatorAccessFilterSerializer(serializers.Serializer):
    vehicle_id = serializers.UUIDField(required=False)
    operator_company_id = serializers.UUIDField(required=False)
    access_status = serializers.ChoiceField(
        choices=VehicleOperatorAccess.AccessStatus.choices,
        required=False,
    )
