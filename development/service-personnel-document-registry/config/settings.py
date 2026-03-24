import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

def _required_env(name: str) -> str:
    value = os.environ.get(name)
    if value:
        return value
    raise ImproperlyConfigured(f"{name} must be set for personnel-document-registry.")


SECRET_KEY = _required_env("DJANGO_SECRET_KEY")
DEBUG = os.environ.get("DJANGO_DEBUG", "0") in {"1", "true", "True"}
ALLOWED_HOSTS = [host for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if host]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "personneldocuments",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = []
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if os.environ.get("PERSONNEL_DOCUMENT_TEST_MODE") == "1":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    postgres_db = _required_env("POSTGRES_DB")
    postgres_user = _required_env("POSTGRES_USER")
    postgres_password = _required_env("POSTGRES_PASSWORD")
    postgres_host = _required_env("POSTGRES_HOST")
    postgres_port = _required_env("POSTGRES_PORT")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": postgres_db,
            "USER": postgres_user,
            "PASSWORD": postgres_password,
            "HOST": postgres_host,
            "PORT": postgres_port,
        }
    }

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
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
        "personneldocuments.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "EXCEPTION_HANDLER": "personneldocuments.exceptions.api_exception_handler",
}

JWT_SECRET_KEY = _required_env("JWT_SECRET_KEY")
JWT_ISSUER = os.environ.get("JWT_ISSUER", "msa-server")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "msa-server")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
DRIVER_PROFILE_BASE_URL = os.environ.get("DRIVER_PROFILE_BASE_URL", "http://driver-profile-api:8000")
