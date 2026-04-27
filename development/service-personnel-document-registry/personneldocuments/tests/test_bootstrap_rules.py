import importlib
import os
import sys
from unittest.mock import patch

import jwt
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ImproperlyConfigured
from django.test import RequestFactory, SimpleTestCase, override_settings
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied

import config.settings as settings_module
from personneldocuments.authentication import JWTAuthentication, AuthenticatedPrincipal
from personneldocuments.permissions import AdminOnlyAccess


class RuntimeSettingsBootstrapTests(SimpleTestCase):
    def test_settings_rejects_missing_secret_keys_outside_test_command(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(sys, "argv", ["manage.py", "runserver"]):
            with self.assertRaises(ImproperlyConfigured):
                importlib.reload(settings_module)

    def test_settings_rejects_missing_postgres_configuration_outside_test_command(self):
        env = {
            "DJANGO_SECRET_KEY": "test-secret",
            "JWT_SECRET_KEY": "test-jwt-secret",
        }
        with patch.dict(os.environ, env, clear=True), patch.object(sys, "argv", ["manage.py", "runserver"]):
            with self.assertRaises(ImproperlyConfigured):
                importlib.reload(settings_module)

    def test_settings_does_not_treat_non_test_commands_with_test_argument_as_test_mode(self):
        env = {
            "DJANGO_SECRET_KEY": "test-secret",
            "JWT_SECRET_KEY": "test-jwt-secret",
        }
        argv = ["manage.py", "createsuperuser", "--username", "test"]
        with patch.dict(os.environ, env, clear=True), patch.object(sys, "argv", argv):
            with self.assertRaises(ImproperlyConfigured):
                importlib.reload(settings_module)


class JWTAuthenticationBootstrapTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.authentication = JWTAuthentication()

    def test_rejects_invalid_jwt_signature(self):
        token = jwt.encode(
            {
                "sub": "account-1",
                "type": "access",
                "email": "driver@example.com",
                "role": "admin",
                "aud": "msa-server",
                "iss": "msa-server",
            },
            "wrong-secret-wrong-secret-wrong-secret-0001",
            algorithm="HS256",
        )
        request = self.factory.get("/", HTTP_AUTHORIZATION=f"Bearer {token}")

        with override_settings(
            JWT_SECRET_KEY="expected-secret-expected-secret-0001",
            JWT_ISSUER="msa-server",
            JWT_AUDIENCE="msa-server",
            JWT_ALGORITHM="HS256",
        ):
            with self.assertRaises(AuthenticationFailed):
                self.authentication.authenticate(request)

    def test_rejects_non_bearer_authorization_header(self):
        request = self.factory.get("/", HTTP_AUTHORIZATION="Token abc123")

        with self.assertRaises(AuthenticationFailed):
            self.authentication.authenticate(request)


class AdminOnlyAccessBootstrapTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = AdminOnlyAccess()

    def test_denies_authenticated_non_admin_user(self):
        request = self.factory.get("/")
        request.user = AuthenticatedPrincipal(account_id="account-1", email="driver@example.com", role="user")

        with self.assertRaises(PermissionDenied):
            self.permission.has_permission(request, None)

    def test_denies_anonymous_user(self):
        request = self.factory.get("/")
        request.user = AnonymousUser()

        with self.assertRaises(NotAuthenticated):
            self.permission.has_permission(request, None)


class DocumentsPathBoundaryTests(SimpleTestCase):
    def test_documents_prefix_requires_authentication_once_crud_is_enabled(self):
        response = self.client.get("/documents/")

        self.assertEqual(response.status_code, 401)
