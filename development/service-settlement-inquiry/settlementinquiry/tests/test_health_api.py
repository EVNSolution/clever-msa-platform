from django.test import SimpleTestCase


class HealthApiTests(SimpleTestCase):
    def test_health_returns_ok(self) -> None:
        response = self.client.get("/api/settlement-inquiries/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
