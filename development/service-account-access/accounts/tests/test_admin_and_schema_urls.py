import importlib.util
from unittest import skipUnless

from django.test import SimpleTestCase
from django.conf import settings


class DjangoAdminUrlTests(SimpleTestCase):
    def test_admin_index_redirects_to_login(self):
        response = self.client.get("/admin/account-access/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/account-access/login/", response["Location"])
        self.assertIn("next=/admin/account-access/", response["Location"])

    def test_admin_login_page_renders(self):
        response = self.client.get("/admin/account-access/login/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Django administration")

    def test_admin_static_is_served_from_static_root(self):
        self.assertEqual(settings.STATIC_URL, "/static/")
        self.assertTrue(settings.STATIC_ROOT)
        self.assertIn("whitenoise.middleware.WhiteNoiseMiddleware", settings.MIDDLEWARE)


@skipUnless(importlib.util.find_spec("drf_spectacular"), "drf-spectacular not installed")
class OpenApiDocsUrlTests(SimpleTestCase):
    def test_openapi_yaml_is_available(self):
        response = self.client.get("/openapi.yaml")

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/vnd.oai.openapi", response["Content-Type"])
        self.assertContains(response, "openapi:")

    def test_swagger_ui_renders(self):
        response = self.client.get("/swagger/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="swagger-ui"')
        self.assertContains(response, "swagger-ui-bundle.js")

    def test_redoc_renders(self):
        response = self.client.get("/redoc/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<redoc ")
        self.assertContains(response, "redoc.standalone.js")
