from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


_ERROR_CODE_MAP = {
    status.HTTP_400_BAD_REQUEST: "validation_error",
    status.HTTP_401_UNAUTHORIZED: "authentication_failed",
    status.HTTP_403_FORBIDDEN: "permission_denied",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "server_error",
}


def _extract_message(detail):
    if isinstance(detail, dict):
        if "detail" in detail:
            return str(detail["detail"])
        first_value = next(iter(detail.values()), "Request failed.")
        if isinstance(first_value, list) and first_value:
            return str(first_value[0])
        return str(first_value)
    if isinstance(detail, list) and detail:
        return str(detail[0])
    return str(detail)


def build_api_error_payload(status_code: int, message: str | None = None, details: object | None = None):
    resolved_message = message or _ERROR_CODE_MAP.get(status_code, "request_error").replace("_", " ").title()
    resolved_details = {} if details is None else details
    return {
        "code": _ERROR_CODE_MAP.get(status_code, "request_error"),
        "message": resolved_message,
        "details": resolved_details,
    }


def json_api_error_response(status_code: int, message: str | None = None, details: object | None = None):
    return JsonResponse(
        build_api_error_payload(status_code, message=message, details=details),
        status=status_code,
    )


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return Response(
            build_api_error_payload(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="Unexpected server error.",
            ),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    details = response.data if isinstance(response.data, dict) else {"detail": response.data}
    response.data = build_api_error_payload(
        response.status_code,
        message=_extract_message(response.data),
        details=details,
    )
    return response
