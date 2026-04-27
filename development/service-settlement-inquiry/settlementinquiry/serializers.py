from rest_framework import serializers

from settlementinquiry.models import (
    SettlementInquiryAttachmentReference,
    SettlementInquiryMessage,
    SettlementInquiryThread,
)


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class AttachmentPayloadSerializer(serializers.Serializer):
    daily_delivery_input_snapshot_id = serializers.UUIDField()


class DriverMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField()
    attachment = AttachmentPayloadSerializer(required=False, allow_null=True)


class OperatorMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField()


class OperatorThreadStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SettlementInquiryThread.Status.choices)


class SettlementInquiryAttachmentReferenceSerializer(serializers.ModelSerializer):
    daily_delivery_input_snapshot_id = serializers.UUIDField()

    class Meta:
        model = SettlementInquiryAttachmentReference
        fields = ("daily_delivery_input_snapshot_id", "service_date")


class SettlementInquiryMessageSerializer(serializers.ModelSerializer):
    author_account_id = serializers.UUIDField()
    attachment_references = SettlementInquiryAttachmentReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = SettlementInquiryMessage
        fields = (
            "message_id",
            "thread_id",
            "author_scope",
            "author_account_id",
            "message",
            "attachment_references",
            "created_at",
        )


class SettlementInquiryThreadSerializer(serializers.ModelSerializer):
    driver_id = serializers.UUIDField()
    driver_account_id = serializers.UUIDField()

    class Meta:
        model = SettlementInquiryThread
        fields = (
            "thread_id",
            "driver_id",
            "driver_account_id",
            "status",
            "latest_message_at",
            "created_at",
            "updated_at",
        )
