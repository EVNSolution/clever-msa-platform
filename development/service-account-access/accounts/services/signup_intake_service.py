from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone

from accounts.models import (
    EmailCredential,
    Identity,
    IdentityConsentCurrent,
    IdentityConsentHistory,
    IdentityLoginMethod,
    IdentityProfileHistory,
    IdentitySignupRequest,
    PasswordCredential,
)


class SignupIntakeService:
    def create_signup(self, validated_data: dict) -> dict:
        request_types = validated_data.pop("request_types")
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        company_id = validated_data.pop("company_id")
        privacy_policy_version = validated_data.pop("privacy_policy_version")
        location_policy_version = validated_data.pop("location_policy_version")
        validated_data.pop("privacy_policy_consented")
        validated_data.pop("location_policy_consented")

        now = timezone.now()
        with transaction.atomic():
            identity = Identity.objects.create(**validated_data)
            IdentityProfileHistory.objects.create(
                identity=identity,
                name=identity.name,
                birth_date=identity.birth_date,
            )

            login_method = IdentityLoginMethod.objects.create(
                identity=identity,
                method_type=IdentityLoginMethod.MethodType.EMAIL,
                verified_at=now,
            )
            EmailCredential.objects.create(
                identity_login_method=login_method,
                email=email,
                verified_at=now,
            )
            PasswordCredential.objects.create(
                identity=identity,
                password_hash=make_password(password),
            )

            IdentityConsentCurrent.objects.create(
                identity=identity,
                privacy_policy_version=privacy_policy_version,
                privacy_policy_consented=True,
                privacy_policy_consented_at=now,
                location_policy_version=location_policy_version,
                location_policy_consented=True,
                location_policy_consented_at=now,
            )
            IdentityConsentHistory.objects.bulk_create(
                [
                    IdentityConsentHistory(
                        identity=identity,
                        consent_type=IdentityConsentHistory.ConsentType.PRIVACY_POLICY,
                        version=privacy_policy_version,
                        is_consented=True,
                    ),
                    IdentityConsentHistory(
                        identity=identity,
                        consent_type=IdentityConsentHistory.ConsentType.LOCATION_POLICY,
                        version=location_policy_version,
                        is_consented=True,
                    ),
                ]
            )

            requests = [
                IdentitySignupRequest.objects.create(
                    identity=identity,
                    company_id=company_id,
                    request_type=request_type,
                    status=IdentitySignupRequest.Status.PENDING,
                )
                for request_type in request_types
            ]

        return {"identity": identity, "requests": requests}
