from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Account
from accounts.permissions import IsAdminRole, IsAuthenticatedAccount
from accounts.serializers import (
    AccountDriverLinkSerializer,
    AccountSerializer,
    AccountWriteSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
)
from accounts.services.driver_link_service import DriverLinkService
from accounts.services.jwt_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from accounts.services.lockout_service import LockoutService
from accounts.services.refresh_registry import RefreshRegistry


class UnauthorizedLogin(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_code = "authentication_failed"
    default_detail = "Invalid email or password."


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


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.save()
        return Response(AccountSerializer(account).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        lockout_service = LockoutService()
        if lockout_service.is_locked(email):
            raise UnauthorizedLogin("Account is temporarily locked. Try again later.")

        account = Account.objects.filter(email=email, is_active=True).first()
        if account is None or not account.check_password(serializer.validated_data["password"]):
            lockout_service.record_failure(email)
            raise UnauthorizedLogin("Invalid email or password.")

        lockout_service.clear_failures(email)

        access_token = create_access_token(account)
        refresh_token = create_refresh_token(account)
        RefreshRegistry().register_refresh_token(refresh_token)

        response = Response(
            {
                "access_token": access_token,
                "account": AccountSerializer(account).data,
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, refresh_token)
        return response


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not refresh_token:
            raise AuthenticationFailed("Refresh token is required.")

        registry = RefreshRegistry()
        if not registry.is_registered(refresh_token):
            raise AuthenticationFailed("Refresh token is not registered.")

        payload = decode_token(refresh_token, "refresh")
        account = Account.objects.filter(account_id=payload["sub"], is_active=True).first()
        if account is None:
            raise AuthenticationFailed("Account not found.")

        access_token = create_access_token(account)
        new_refresh_token = create_refresh_token(account)
        registry.rotate_refresh_token(refresh_token, new_refresh_token)

        response = Response(
            {
                "access_token": access_token,
                "account": AccountSerializer(account).data,
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, new_refresh_token)
        return response


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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


class MeView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    def get(self, request):
        return Response(AccountSerializer(request.user).data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticatedAccount]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"account": request.user},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password updated."}, status=status.HTTP_200_OK)


class AccountDriverLinkView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        serializer = AccountDriverLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        account_id = str(serializer.validated_data["account_id"])
        driver_id = str(serializer.validated_data["driver_id"])
        DriverLinkService().link_account_to_driver(
            account_id=account_id,
            driver_id=driver_id,
            authorization=request.META.get("HTTP_AUTHORIZATION", ""),
        )
        return Response(
            {"account_id": account_id, "driver_id": driver_id},
            status=status.HTTP_200_OK,
        )


class AccountListCreateView(generics.ListCreateAPIView):
    queryset = Account.objects.all()
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AccountWriteSerializer
        return AccountSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.save()
        return Response(AccountSerializer(account).data, status=status.HTTP_201_CREATED)


class AccountDetailView(generics.RetrieveUpdateAPIView):
    queryset = Account.objects.all()
    lookup_field = "account_id"
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return AccountWriteSerializer
        return AccountSerializer

    def update(self, request, *args, **kwargs):
        account = self.get_object()
        serializer = self.get_serializer(account, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        account = serializer.save()
        return Response(AccountSerializer(account).data, status=status.HTTP_200_OK)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)
