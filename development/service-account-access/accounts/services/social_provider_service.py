import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed, ValidationError

from accounts.models import SocialCredential


class KakaoSocialProviderAdapter:
    provider_type = SocialCredential.ProviderType.KAKAO

    def __init__(self) -> None:
        self.user_info_url = settings.KAKAO_USER_INFO_URL
        self.rest_api_key = settings.KAKAO_REST_API_KEY
        self.client_secret = settings.KAKAO_CLIENT_SECRET

    def resolve_subject(self, *, access_token: str) -> dict:
        if not access_token:
            raise ValidationError({"provider_access_token": ["Provider access token is required."]})

        payload = self._fetch_user_info(access_token)
        provider_subject = payload.get("id")
        if provider_subject in {None, ""}:
            raise AuthenticationFailed("Social access token is invalid.")

        return {
            "provider_type": self.provider_type,
            "provider_subject": str(provider_subject),
        }

    def _fetch_user_info(self, access_token: str) -> dict:
        request = Request(
            self.user_info_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
        )
        try:
            with urlopen(request, timeout=5) as response:
                payload = response.read().decode("utf-8")
        except (HTTPError, URLError, TimeoutError) as exc:
            raise AuthenticationFailed("Social access token is invalid.") from exc

        try:
            return json.loads(payload)
        except json.JSONDecodeError as exc:
            raise AuthenticationFailed("Social provider response is invalid.") from exc


class SocialProviderService:
    def resolve_subject(self, *, provider_type: str, access_token: str) -> dict:
        adapter = self._get_adapter(provider_type)
        return adapter.resolve_subject(access_token=access_token)

    def _get_adapter(self, provider_type: str):
        if provider_type == SocialCredential.ProviderType.KAKAO:
            return KakaoSocialProviderAdapter()
        raise ValidationError({"provider_type": ["Unsupported social provider."]})
