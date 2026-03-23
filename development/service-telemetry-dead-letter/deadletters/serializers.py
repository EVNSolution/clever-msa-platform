import json

from django.conf import settings
from rest_framework import serializers

from deadletters.authentication import AuthenticatedProducerPrincipal
from deadletters.models import TelemetryDeadLetter


class TelemetryDeadLetterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelemetryDeadLetter
        fields = (
            "telemetry_dead_letter_id",
            "source_service",
            "message_topic",
            "source_terminal_id",
            "source_vehicle_id",
            "message_type",
            "payload_json",
            "received_at",
            "failure_class",
            "error_message",
            "retry_attempts",
            "failure_fingerprint",
            "failed_at",
        )
        read_only_fields = ("telemetry_dead_letter_id",)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if isinstance(user, AuthenticatedProducerPrincipal):
            if attrs.get("source_service") != user.source_service:
                raise serializers.ValidationError(
                    {"source_service": "source_service must match the authenticated producer."}
                )
        return attrs

    def validate_payload_json(self, value):
        payload_bytes = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(payload_bytes) > settings.TELEMETRY_DEAD_LETTER_MAX_PAYLOAD_BYTES:
            raise serializers.ValidationError(
                f"payload_json exceeds max payload size of {settings.TELEMETRY_DEAD_LETTER_MAX_PAYLOAD_BYTES} bytes."
            )
        return value
