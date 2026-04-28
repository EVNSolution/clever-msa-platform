from unittest.mock import patch
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import (
    Identity,
    IdentityLoginMethod,
    PhoneCredential,
    IdentitySignupRequest,
)

from django.conf import settings

@override_settings(
    DATABASES={
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    },
    MIDDLEWARE=[m for m in settings.MIDDLEWARE if 'whitenoise' not in m.lower()]
)
class CheonhaSignupTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_signup_with_contact_phone_number_creates_phone_credential(self):
        # 1. Signup with contact_phone_number
        response = self.client.post(
            "/identity-signup-requests/",
            {
                "name": "천하배송원",
                "birth_date": "1995-05-05",
                "email": "driver@cheonha.com",
                "contact_phone_number": "010-1234-5678",
                "password": "Signup12!",
                "company_id": "30000000-0000-0000-0000-000000000001",
                "request_types": [
                    IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
                ],
                "privacy_policy_version": "v1.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v1.0",
                "location_policy_consented": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        identity_id = response.data["identity_id"]

        # 2. Verify PhoneCredential exists
        identity = Identity.objects.get(identity_id=identity_id)
        phone_method = IdentityLoginMethod.objects.filter(
            identity=identity, 
            method_type=IdentityLoginMethod.MethodType.PHONE
        ).first()
        self.assertIsNotNone(phone_method)

        phone_credential = PhoneCredential.objects.get(identity_login_method=phone_method)
        self.assertEqual(phone_credential.phone_number, "010-1234-5678")

    @patch("accounts.services.organization_tenant_lookup_client.OrganizationTenantLookupClient.resolve_tenant")
    def test_signup_with_tenant_code_resolves_company_and_auto_approves(self, mock_resolve):
        from uuid import UUID
        # 1. Mock tenant resolution
        mock_resolve.return_value = {
            "company_id": UUID("30000000-0000-0000-0000-000000000001"),
            "name": "천하운수",
            "tenant_code": "cheonha"
        }

        # 2. Signup with tenant_code
        response = self.client.post(
            "/identity-signup-requests/",
            {
                "name": "천하기사2",
                "birth_date": "1992-02-02",
                "email": "driver2@cheonha.com",
                "tenant_code": "cheonha",
                "password": "Signup12!",
                "request_types": [
                    IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE,
                ],
                "privacy_policy_version": "v1.0",
                "privacy_policy_consented": True,
                "location_policy_version": "v1.0",
                "location_policy_consented": True,
            },
            format="json",
        )

        if response.status_code != 201:
            print(f"\nResponse data on error: {response.data}")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["requests"]), 1)
        # Check if auto-approved
        self.assertEqual(response.data["requests"][0]["status"], IdentitySignupRequest.Status.APPROVED)
        
        # Verify Identity belongs to the correct company
        request = IdentitySignupRequest.objects.get(identity_signup_request_id=response.data["requests"][0]["identity_signup_request_id"])
        self.assertEqual(str(request.company_id), "30000000-0000-0000-0000-000000000001")

    def test_identity_me_returns_contact_phone_number(self):
        # 1. Create Identity and PhoneCredential
        identity = Identity.objects.create(name="천하기사", birth_date="1980-01-01")
        login_method = IdentityLoginMethod.objects.create(
            identity=identity,
            method_type=IdentityLoginMethod.MethodType.PHONE,
        )
        PhoneCredential.objects.create(
            identity_login_method=login_method,
            phone_number="010-9999-8888"
        )

        # 2. Login (or simulate authentication)
        # For simplicity in this test, we'll manually set the user if possible, 
        # or just test the serializer directly which is where the logic is.
        from accounts.serializers import IdentitySummarySerializer
        serializer = IdentitySummarySerializer(identity)
        self.assertEqual(serializer.data["contact_phone_number"], "010-9999-8888")
