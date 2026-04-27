import logging

try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from settlementinquiry.models import SettlementInquiryMessage, SettlementInquiryThread
from settlementinquiry.permissions import AdminOnlyAccess, AuthenticatedInquiryAccess
from settlementinquiry.serializers import (
    DriverMessageCreateSerializer,
    HealthSerializer,
    OperatorMessageCreateSerializer,
    OperatorThreadStatusUpdateSerializer,
    SettlementInquiryMessageSerializer,
    SettlementInquiryThreadSerializer,
)
from settlementinquiry.services.message_service import MessageService
from settlementinquiry.services.notification_handoff_service import send_operator_reply_inbox_notification
from settlementinquiry.services.preview_client import PreviewClient, PreviewUnavailableError
from settlementinquiry.services.source_clients import SourceNotFoundError, SourceServiceError

logger = logging.getLogger(__name__)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


def _driver_identity(request) -> tuple[str, str]:
    user = request.user
    driver_account_id = getattr(user, "account_id", "")
    driver_id = getattr(user, "driver_id", None) or driver_account_id
    if not driver_account_id or not driver_id:
        raise PermissionDenied("Driver identity is required.")
    return driver_id, driver_account_id


def _serialize_messages_with_preview(messages, *, authorization: str) -> list[dict]:
    serialized = SettlementInquiryMessageSerializer(messages, many=True).data
    preview_client = PreviewClient()
    for payload in serialized:
        for attachment in payload["attachment_references"]:
            snapshot_id = attachment["daily_delivery_input_snapshot_id"]
            try:
                attachment["preview"] = preview_client.get_snapshot_preview(
                    snapshot_id=snapshot_id,
                    authorization=authorization,
                )
                attachment["preview_status"] = "available"
            except PreviewUnavailableError:
                attachment["preview_status"] = "unavailable"
    return serialized


class DriverThreadView(APIView):
    permission_classes = [AuthenticatedInquiryAccess]

    def get(self, request):
        driver_id, _driver_account_id = _driver_identity(request)
        thread = SettlementInquiryThread.objects.filter(driver_id=driver_id).first()
        payload = SettlementInquiryThreadSerializer(thread).data if thread is not None else None
        return Response({"thread": payload})


class DriverMessageListCreateView(APIView):
    permission_classes = [AuthenticatedInquiryAccess]

    def get(self, request):
        driver_id, _driver_account_id = _driver_identity(request)
        thread = SettlementInquiryThread.objects.filter(driver_id=driver_id).first()
        if thread is None:
            return Response({"messages": []})
        return Response(
            {
                "messages": _serialize_messages_with_preview(
                    thread.messages.all(),
                    authorization=request.headers.get("Authorization", ""),
                )
            }
        )

    def post(self, request):
        driver_id, driver_account_id = _driver_identity(request)
        serializer = DriverMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = MessageService().create_driver_message(
                driver_id=driver_id,
                driver_account_id=driver_account_id,
                message=serializer.validated_data["message"],
                attachment_payload=serializer.validated_data.get("attachment"),
                authorization=request.headers.get("Authorization", ""),
            )
        except SourceNotFoundError as exc:
            raise ValidationError({"attachment": [str(exc)]}) from exc
        except SourceServiceError as exc:
            raise ValidationError({"attachment": [str(exc)]}) from exc

        return Response(
            SettlementInquiryMessageSerializer(result.message).data,
            status=201,
        )


class OperatorThreadListView(APIView):
    permission_classes = [AdminOnlyAccess]

    def get(self, request):
        threads = SettlementInquiryThread.objects.all()
        return Response({"threads": SettlementInquiryThreadSerializer(threads, many=True).data})


class OperatorThreadMessageListCreateView(APIView):
    permission_classes = [AdminOnlyAccess]

    def get(self, request, thread_id):
        thread = get_object_or_404(SettlementInquiryThread, thread_id=thread_id)
        return Response(
            {
                "messages": _serialize_messages_with_preview(
                    thread.messages.all(),
                    authorization=request.headers.get("Authorization", ""),
                )
            }
        )

    def post(self, request, thread_id):
        thread = get_object_or_404(SettlementInquiryThread, thread_id=thread_id)
        serializer = OperatorMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = MessageService().create_operator_message(
            thread=thread,
            operator_account_id=request.user.account_id,
            message=serializer.validated_data["message"],
        )
        try:
            send_operator_reply_inbox_notification(
                thread=result.thread,
                inquiry_message=result.message,
                authorization=request.headers.get("Authorization", ""),
            )
        except Exception:
            logger.warning(
                "Settlement inquiry reply inbox handoff failed.",
                extra={
                    "thread_id": str(result.thread.thread_id),
                    "message_id": str(result.message.message_id),
                },
                exc_info=True,
            )
        return Response(SettlementInquiryMessageSerializer(result.message).data, status=201)


class OperatorThreadDetailView(APIView):
    permission_classes = [AdminOnlyAccess]

    def patch(self, request, thread_id):
        thread = get_object_or_404(SettlementInquiryThread, thread_id=thread_id)
        serializer = OperatorThreadStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        thread.status = serializer.validated_data["status"]
        thread.save(update_fields=["status", "updated_at"])
        return Response(SettlementInquiryThreadSerializer(thread).data)
