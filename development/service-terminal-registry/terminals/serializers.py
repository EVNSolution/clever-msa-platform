from datetime import timezone

from rest_framework import serializers

from terminals.models import TerminalInstallation, TerminalRegistry
from terminals.services.vehicle_registry_client import (
    SourceNotFoundError,
    SourceServiceError,
    VehicleRegistryClient,
)


class TerminalRegistrySerializer(serializers.ModelSerializer):
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
        model = TerminalRegistry
        fields = (
            "terminal_id",
            "manufacturer_company_id",
            "imei",
            "iccid",
            "firmware_version",
            "protocol_version",
            "app_version",
            "terminal_status",
            "created_at",
            "updated_at",
        )


class TerminalInstallationSerializer(serializers.ModelSerializer):
    terminal_id = serializers.PrimaryKeyRelatedField(
        queryset=TerminalRegistry.objects.all(),
        source="terminal",
    )
    installed_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        default_timezone=timezone.utc,
    )
    removed_at = serializers.DateTimeField(
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
        model = TerminalInstallation
        fields = (
            "terminal_installation_id",
            "terminal_id",
            "vehicle_id",
            "installation_status",
            "installed_at",
            "removed_at",
            "created_at",
            "updated_at",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["terminal_id"] = str(instance.terminal_id)
        data["vehicle_id"] = str(instance.vehicle_id)
        return data

    def validate(self, attrs):
        terminal = attrs.get("terminal", getattr(self.instance, "terminal", None))
        vehicle_id = attrs.get("vehicle_id", getattr(self.instance, "vehicle_id", None))
        installation_status = attrs.get(
            "installation_status",
            getattr(self.instance, "installation_status", None),
        )
        removed_at = attrs.get("removed_at", getattr(self.instance, "removed_at", None))

        if (
            installation_status == TerminalInstallation.InstallationStatus.REMOVED
            and removed_at is None
        ):
            raise serializers.ValidationError(
                {"removed_at": ["removed_at is required when installation_status is removed."]}
            )

        if installation_status == TerminalInstallation.InstallationStatus.INSTALLED:
            if terminal is None:
                raise serializers.ValidationError({"terminal_id": ["This field is required."]})
            if terminal.terminal_status != TerminalRegistry.TerminalStatus.ACTIVE:
                raise serializers.ValidationError(
                    {"terminal_id": ["Only active terminals can be installed."]}
                )

            terminal_queryset = TerminalInstallation.objects.filter(
                terminal=terminal,
                installation_status=TerminalInstallation.InstallationStatus.INSTALLED,
            )
            vehicle_queryset = TerminalInstallation.objects.filter(
                vehicle_id=vehicle_id,
                installation_status=TerminalInstallation.InstallationStatus.INSTALLED,
            )
            if self.instance is not None:
                terminal_queryset = terminal_queryset.exclude(
                    terminal_installation_id=self.instance.terminal_installation_id
                )
                vehicle_queryset = vehicle_queryset.exclude(
                    terminal_installation_id=self.instance.terminal_installation_id
                )
            if terminal_queryset.exists():
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            "A terminal may have at most one active installation."
                        ]
                    }
                )
            if vehicle_queryset.exists():
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            "A vehicle may have at most one active terminal installation."
                        ]
                    }
                )

            request = self.context.get("request")
            authorization = request.headers.get("Authorization", "") if request else ""
            try:
                vehicle = VehicleRegistryClient().get_vehicle(
                    vehicle_id=str(vehicle_id),
                    authorization=authorization,
                )
            except SourceNotFoundError as exc:
                raise serializers.ValidationError(
                    {"vehicle_id": ["Vehicle not found in vehicle registry."]}
                ) from exc
            except SourceServiceError as exc:
                raise serializers.ValidationError(
                    {"vehicle_id": ["Vehicle validation is unavailable."]}
                ) from exc

            if vehicle.get("vehicle_status") != "active":
                raise serializers.ValidationError(
                    {"vehicle_id": ["Only active vehicles can receive a terminal installation."]}
                )

        return attrs
