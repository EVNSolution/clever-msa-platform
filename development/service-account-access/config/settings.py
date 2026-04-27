import importlib.util
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
HAS_DRF_SPECTACULAR = importlib.util.find_spec("drf_spectacular") is not None

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "0") in {"1", "true", "True"}
ALLOWED_HOSTS = [host for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if host]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "accounts",
]
if HAS_DRF_SPECTACULAR:
    INSTALLED_APPS.insert(-1, "drf_spectacular")

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "account_auth"),
        "USER": os.environ.get("POSTGRES_USER", "account_auth"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "account_auth"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    origin
    for origin in os.environ.get(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if origin
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "EXCEPTION_HANDLER": "accounts.exceptions.api_exception_handler",
}
if HAS_DRF_SPECTACULAR:
    REST_FRAMEWORK["DEFAULT_SCHEMA_CLASS"] = "drf_spectacular.openapi.AutoSchema"

if HAS_DRF_SPECTACULAR:
    SPECTACULAR_SETTINGS = {
        "TITLE": "CLEVER Account Access API",
        "DESCRIPTION": "Service-owned OpenAPI schema for service-account-access.",
        "VERSION": "1.0.0",
        "SERVE_INCLUDE_SCHEMA": False,
    }

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-me")
JWT_ISSUER = os.environ.get("JWT_ISSUER", "msa-server")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "msa-server")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_LIFETIME = timedelta(
    minutes=int(os.environ.get("ACCESS_TOKEN_LIFETIME_MINUTES", "60"))
)
REFRESH_TOKEN_LIFETIME = timedelta(
    days=int(os.environ.get("REFRESH_TOKEN_LIFETIME_DAYS", "7"))
)
REFRESH_COOKIE_NAME = os.environ.get("REFRESH_COOKIE_NAME", "refresh_token")
REFRESH_COOKIE_PATH = "/api/auth/"
REFRESH_COOKIE_SAMESITE = "Lax"
REFRESH_COOKIE_SECURE = False
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
LOGIN_LOCKOUT_THRESHOLD = int(os.environ.get("LOGIN_LOCKOUT_THRESHOLD", "3"))
LOGIN_LOCKOUT_TTL_SECONDS = int(os.environ.get("LOGIN_LOCKOUT_TTL_SECONDS", "300"))
DRIVER_PROFILE_BASE_URL = os.environ.get(
    "DRIVER_PROFILE_BASE_URL",
    "http://driver-profile-api:8000",
)
ORGANIZATION_MASTER_BASE_URL = os.environ.get(
    "ORGANIZATION_MASTER_BASE_URL",
    "http://organization-master-api:8000",
)
KAKAO_REST_API_KEY = os.environ.get("KAKAO_REST_API_KEY", "")
KAKAO_CLIENT_SECRET = os.environ.get("KAKAO_CLIENT_SECRET", "")
KAKAO_USER_INFO_URL = os.environ.get(
    "KAKAO_USER_INFO_URL",
    "https://kapi.kakao.com/v2/user/me",
)
AUTO_APPROVED_DRIVER_SIGNUP_COMPANY_IDS = [
    "30000000-0000-0000-0000-000000000001",
]
