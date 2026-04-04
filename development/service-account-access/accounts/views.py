from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from accounts.models import DriverAccountLink, Identity, PasswordCredential
from accounts.permissions import IsAuthenticatedAccount
from accounts.session_principal import IdentitySessionPrincipal
from accounts.serializers import (
    DriverAccountLinkSummarySerializer,
    HealthSerializer,
    IdentityAuthSessionSerializer,
    IdentityConsentCurrentSerializer,
    IdentityConsentRecoverSerializer,
    IdentityConsentWithdrawSerializer,
    IdentityLoginSerializer,
    IdentityLoginMethodCreateSerializer,
    IdentityLoginMethodDeleteSerializer,
    IdentityLoginMethodListSerializer,
    IdentityLoginMethodSerializer,
    IdentityPasswordSerializer,
    IdentityProfileSerializer,
    IdentityProfileUpdateSerializer,
    IdentityRecoverySerializer,
    IdentitySignupRequestCreateSerializer,
    IdentitySignupRequestSummarySerializer,
    IdentitySignupIntakeResultSerializer,
    IdentitySignupIntakeSerializer,
    IdentitySummarySerializer,
    SignupRequestActionSerializer,
    SignupRequestListSerializer,
    SignupRequestSetupSerializer,
    StatusMessageSerializer,
)
from accounts.services.identity_auth_service import IdentityAuthService
from accounts.services.identity_consent_service import IdentityConsentService
from accounts.services.identity_login_method_service import IdentityLoginMethodService
from accounts.services.identity_recovery_service import IdentityRecoveryService
from accounts.services.jwt_service import (
    create_identity_access_token,
    create_identity_refresh_token,
    decode_token,
)
from accounts.services.refresh_registry import RefreshRegistry
from accounts.services.signup_request_service import SignupRequestService
def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        token,
        httponly=True,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        secure=settings.REFRESH_COOKIE_SECURE,
        max_age=int(settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def _serialize_active_account(principal):
    active_account = principal.active_account
    if active_account is None:
        return None

    payload = {
        "account_type": principal.active_account_type,
        "account_id": str(
            getattr(
                active_account,
                f"{principal.active_account_type}_account_id",
                getattr(active_account, "manager_account_id", None),
            )
        ),
    }
    if hasattr(active_account, "company_id"):
        payload["company_id"] = str(active_account.company_id)
    if hasattr(active_account, "role_type"):
        payload["role_type"] = active_account.role_type
    return payload


def _identity_session_payload(principal, access_token: str) -> dict:
    return {
        "access_token": access_token,
        "session_kind": principal.session_kind,
        "email": principal.email,
        "identity": IdentitySummarySerializer(principal.identity).data,
        "active_account": _serialize_active_account(principal),
        "available_account_types": principal.available_account_types,
    }


def _require_full_identity_session(request):
    if not hasattr(request.user, "identity"):
        raise AuthenticationFailed("Identity session is required.")
    if getattr(request.user, "is_consent_recovery", False):
        raise PermissionDenied("Consent recovery is required.")


def _rotate_identity_session(request, principal):
    access_token = create_identity_access_token(principal)
    new_refresh_token = create_identity_refresh_token(principal)
    current_refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
    registry = RefreshRegistry()
    if current_refresh_token and registry.is_registered(current_refresh_token):
        registry.rotate_refresh_token(current_refresh_token, new_refresh_token)
    else:
        registry.register_refresh_token(new_refresh_token)

    response = Response(
        _identity_session_payload(principal, access_token),
        status=status.HTTP_200_OK,
    )
    _set_refresh_cookie(response, new_refresh_token)
    return response


class IdentitySignupRequestIntakeView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=IdentitySignupIntakeSerializer,
        responses={201: IdentitySignupIntakeResultSerializer},
    )
    def post(self, request):
        serializer = IdentitySignupIntakeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(
            IdentitySignupIntakeResultSerializer(result).data,
            status=status.HTTP_201_CREATED,
        )


class IdentityLoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=IdentityLoginSerializer, responses={200: IdentityAuthSessionSerializer})
    def post(self, request):
        serializer = IdentityLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        principal = IdentityAuthService().authenticate_email_password(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        access_token = create_identity_access_token(principal)
        refresh_token = create_identity_refresh_token(principal)
        RefreshRegistry().register_refresh_token(refresh_token)

        response = Response(
            _identity_session_payload(principal, access_token),
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, refresh_token)
        return response


class IdentityRefreshView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: IdentityAuthSessionSerializer})
    def post(self, request):
        refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not refresh_token:
            raise AuthenticationFailed("Refresh token is required.")

        registry = RefreshRegistry()
        if not registry.is_registered(refresh_token):
            raise AuthenticationFailed("Refresh token is not registered.")

        payload = decode_token(refresh_token, "refresh")
        if payload.get("principal_kind") not in {
            "identity_session",
            "identity_consent_recovery_session",
        }:
            raise AuthenticationFailed("Refresh token is not valid for identity session.")

        identity = Identity.objects.filter(
            identity_id=payload.get("identity_id", payload["sub"]),
            status=Identity.Status.ACTIVE,
        ).first()
        if identity is None:
            raise AuthenticationFailed("Identity not found.")
        session_kind = (
            "consent_recovery"
            if payload.get("principal_kind") == "identity_consent_recovery_session"
            or not IdentityConsentService().is_fully_consented(identity)
            else "normal"
        )
        session_principal = IdentitySessionPrincipal.from_identity(identity, session_kind=session_kind)

        access_token = create_identity_access_token(session_principal)
        new_refresh_token = create_identity_refresh_token(session_principal)
        registry.rotate_refresh_token(refresh_token, new_refresh_token)

        response = Response(
            _identity_session_payload(session_principal, access_token),
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, new_refresh_token)
        return response


class IdentityLogoutView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={204: None})
    def post(self, request):
        refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if refresh_token:
            try:
                RefreshRegistry().remove_refresh_token(refresh_token)
            except AuthenticationFailed:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


class IdentityMeView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: IdentityAuthSessionSerializer})
    def get(self, request):
        if not hasattr(request.user, "identity"):
            raise AuthenticationFailed("Identity session is required.")
        return Response(
            {
                "access_token": "",
                "session_kind": request.user.session_kind,
                "email": request.user.email,
                "identity": IdentitySummarySerializer(request.user.identity).data,
                "active_account": _serialize_active_account(request.user),
                "available_account_types": request.user.available_account_types,
            },
            status=status.HTTP_200_OK,
        )


class IdentityProfileView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: IdentityProfileSerializer})
    def get(self, request):
        _require_full_identity_session(request)
        return Response(IdentityProfileSerializer(request.user.identity).data, status=status.HTTP_200_OK)

    @extend_schema(request=IdentityProfileUpdateSerializer, responses={200: IdentityProfileSerializer})
    def patch(self, request):
        _require_full_identity_session(request)
        serializer = IdentityProfileUpdateSerializer(
            data=request.data,
            context={"identity": request.user.identity},
        )
        serializer.is_valid(raise_exception=True)
        identity = serializer.save()
        return Response(IdentityProfileSerializer(identity).data, status=status.HTTP_200_OK)


class IdentityConsentView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: IdentityConsentCurrentSerializer})
    def get(self, request):
        if not hasattr(request.user, "identity"):
            raise AuthenticationFailed("Identity session is required.")
        return Response(
            IdentityConsentCurrentSerializer(request.user.identity.consent_current).data,
            status=status.HTTP_200_OK,
        )


class IdentityConsentWithdrawView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(request=IdentityConsentWithdrawSerializer, responses={200: IdentityAuthSessionSerializer})
    def post(self, request):
        _require_full_identity_session(request)
        serializer = IdentityConsentWithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        IdentityConsentService().withdraw(
            request.user.identity,
            consent_type=serializer.validated_data["consent_type"],
        )
        recovery_principal = IdentitySessionPrincipal.from_identity(
            request.user.identity,
            session_kind="consent_recovery",
        )
        return _rotate_identity_session(request, recovery_principal)


class IdentityConsentRecoverView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(request=IdentityConsentRecoverSerializer, responses={200: IdentityAuthSessionSerializer})
    def post(self, request):
        if not hasattr(request.user, "identity"):
            raise AuthenticationFailed("Identity session is required.")
        serializer = IdentityConsentRecoverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        IdentityConsentService().recover(
            request.user.identity,
            privacy_policy_version=serializer.validated_data["privacy_policy_version"],
            location_policy_version=serializer.validated_data["location_policy_version"],
        )
        principal = IdentitySessionPrincipal.from_identity(request.user.identity, session_kind="normal")
        return _rotate_identity_session(request, principal)


class IdentityLoginMethodListCreateView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: IdentityLoginMethodListSerializer})
    def get(self, request):
        _require_full_identity_session(request)
        methods = request.user.identity.login_methods.select_related(
            "email_credential",
            "phone_credential",
            "social_credential",
        ).order_by("method_type", "identity_login_method_id")
        return Response(
            IdentityLoginMethodListSerializer({"methods": methods}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(request=IdentityLoginMethodCreateSerializer, responses={201: IdentityLoginMethodSerializer})
    def post(self, request):
        _require_full_identity_session(request)
        serializer = IdentityLoginMethodCreateSerializer(
            data=request.data,
            context={"identity": request.user.identity},
        )
        serializer.is_valid(raise_exception=True)
        login_method = serializer.save()
        return Response(IdentityLoginMethodSerializer(login_method).data, status=status.HTTP_201_CREATED)


class IdentityLoginMethodDeleteView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(request=IdentityLoginMethodDeleteSerializer, responses={204: None})
    def post(self, request, method_id):
        _require_full_identity_session(request)
        serializer = IdentityLoginMethodDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login_method = get_object_or_404(
            request.user.identity.login_methods,
            identity_login_method_id=method_id,
        )
        result = IdentityLoginMethodService().delete_method(
            request.user.identity,
            login_method,
            confirm=serializer.validated_data.get("confirm", False),
            current_password=serializer.validated_data.get("current_password"),
        )
        response = Response(status=status.HTTP_204_NO_CONTENT)
        if result == "archived":
            refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
            if refresh_token:
                try:
                    RefreshRegistry().remove_refresh_token(refresh_token)
                except AuthenticationFailed:
                    pass
            _clear_refresh_cookie(response)
        return response


class IdentityRecoveryView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=IdentityRecoverySerializer, responses={200: IdentityAuthSessionSerializer})
    def post(self, request):
        serializer = IdentityRecoverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identity = IdentityRecoveryService().recover_with_email_password(
            name=serializer.validated_data["name"],
            birth_date=serializer.validated_data["birth_date"],
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            privacy_policy_version=serializer.validated_data["privacy_policy_version"],
            location_policy_version=serializer.validated_data["location_policy_version"],
        )
        principal = IdentitySessionPrincipal.from_identity(identity, session_kind="normal")
        access_token = create_identity_access_token(principal)
        refresh_token = create_identity_refresh_token(principal)
        RefreshRegistry().register_refresh_token(refresh_token)
        response = Response(
            _identity_session_payload(principal, access_token),
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, refresh_token)
        return response


class IdentityPasswordView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(request=IdentityPasswordSerializer, responses={200: StatusMessageSerializer})
    def put(self, request):
        _require_full_identity_session(request)
        serializer = IdentityPasswordSerializer(
            data=request.data,
            context={"identity": request.user.identity},
        )
        serializer.is_valid(raise_exception=True)
        PasswordCredential.objects.update_or_create(
            identity=request.user.identity,
            defaults={"password_hash": make_password(serializer.validated_data["new_password"])},
        )
        return Response({"message": "Password updated."}, status=status.HTTP_200_OK)


class IdentitySignupRequestSelfListView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: SignupRequestListSerializer})
    def get(self, request):
        _require_full_identity_session(request)
        requests = request.user.identity.signup_requests.select_related("identity").order_by("-requested_at")
        serializer = SignupRequestListSerializer(
            {
                "identity": request.user.identity,
                "requests": requests,
                "inquiry_message": "관련 문의는 관리자에게 문의하세요.",
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=IdentitySignupRequestCreateSerializer,
        responses={201: IdentitySignupRequestSummarySerializer},
    )
    def post(self, request):
        _require_full_identity_session(request)
        serializer = IdentitySignupRequestCreateSerializer(
            data=request.data,
            context={"identity": request.user.identity},
        )
        serializer.is_valid(raise_exception=True)
        created_request = serializer.save()
        return Response(
            IdentitySignupRequestSummarySerializer(created_request).data,
            status=status.HTTP_201_CREATED,
        )


class IdentitySignupRequestCancelView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: IdentitySignupRequestSummarySerializer})
    def post(self, request, request_id):
        _require_full_identity_session(request)
        signup_request = get_object_or_404(
            request.user.identity.signup_requests,
            identity_signup_request_id=request_id,
        )
        updated = SignupRequestService().cancel_request(request.user, signup_request)
        return Response(IdentitySignupRequestSummarySerializer(updated).data, status=status.HTTP_200_OK)


class IdentitySignupRequestManagementListView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: SignupRequestListSerializer})
    def get(self, request):
        _require_full_identity_session(request)
        requests = SignupRequestService().list_manageable_requests(
            request.user,
            status_value=request.query_params.get("status"),
        )
        serializer = SignupRequestListSerializer(
            {
                "identity": request.user.identity,
                "requests": requests,
                "inquiry_message": "",
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class IdentitySignupRequestApproveView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: IdentitySignupRequestSummarySerializer})
    def post(self, request, request_id):
        _require_full_identity_session(request)
        signup_request = SignupRequestService().get_manageable_request(request.user, request_id)
        updated = SignupRequestService().approve_request(request.user, signup_request)
        return Response(IdentitySignupRequestSummarySerializer(updated).data, status=status.HTTP_200_OK)


class IdentitySignupRequestRejectView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(request=SignupRequestActionSerializer, responses={200: IdentitySignupRequestSummarySerializer})
    def post(self, request, request_id):
        _require_full_identity_session(request)
        serializer = SignupRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        signup_request = SignupRequestService().get_manageable_request(request.user, request_id)
        updated = SignupRequestService().reject_request(
            request.user,
            signup_request,
            reject_reason=serializer.validated_data["reject_reason"],
        )
        return Response(IdentitySignupRequestSummarySerializer(updated).data, status=status.HTTP_200_OK)


class IdentitySignupRequestCompleteSetupView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(request=SignupRequestSetupSerializer, responses={200: IdentitySignupRequestSummarySerializer})
    def post(self, request, request_id):
        _require_full_identity_session(request)
        serializer = SignupRequestSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        signup_request = SignupRequestService().get_manageable_request(request.user, request_id)
        updated = SignupRequestService().complete_manager_setup(
            request.user,
            signup_request,
            role_type=serializer.validated_data["role_type"],
        )
        return Response(IdentitySignupRequestSummarySerializer(updated).data, status=status.HTTP_200_OK)


class DriverAccountLinkListView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    @extend_schema(responses={200: DriverAccountLinkSummarySerializer(many=True)})
    def get(self, request):
        _require_full_identity_session(request)
        if request.user.active_account_type not in {"system_admin", "manager"}:
            raise PermissionDenied("Driver account links are visible only to admin accounts.")

        queryset = DriverAccountLink.objects.select_related("driver_account__identity").order_by("-linked_at")
        driver_id = request.query_params.get("driver_id")
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        driver_account_id = request.query_params.get("driver_account_id")
        if driver_account_id:
            queryset = queryset.filter(driver_account_id=driver_account_id)
        active_only = request.query_params.get("active_only", "true").lower() != "false"
        if active_only:
            queryset = queryset.filter(
                unlinked_at__isnull=True,
                driver_account__status="active",
                driver_account__identity__status="active",
            )

        return Response(
            DriverAccountLinkSummarySerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)
