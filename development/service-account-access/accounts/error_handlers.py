from rest_framework import status

from accounts.exceptions import json_api_error_response


def bad_request(request, exception):
    return json_api_error_response(
        status.HTTP_400_BAD_REQUEST,
        message="Bad request.",
    )


def permission_denied(request, exception):
    return json_api_error_response(
        status.HTTP_403_FORBIDDEN,
        message="Permission denied.",
    )


def page_not_found(request, exception):
    return json_api_error_response(
        status.HTTP_404_NOT_FOUND,
        message="Requested API endpoint was not found.",
    )


def server_error(request):
    return json_api_error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Unexpected server error.",
    )
