import json
from urllib.request import Request, urlopen

from django.conf import settings


def send_operator_reply_inbox_notification(*, thread, inquiry_message, authorization: str) -> None:
    payload = {
        "recipient_account_id": str(thread.driver_account_id),
        "category": "settlement_inquiry",
        "source_type": "settlement_inquiry_thread",
        "source_ref": str(thread.thread_id),
        "title": "정산 문의에 답변이 도착했습니다.",
        "body": inquiry_message.message,
        "status": "unread",
    }
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if authorization:
        headers["Authorization"] = authorization

    request = Request(
        f"{settings.NOTIFICATION_HUB_BASE_URL.rstrip('/')}/general/",
        data=body,
        headers=headers,
        method="POST",
    )
    with urlopen(request, timeout=5) as response:
        response.read()
