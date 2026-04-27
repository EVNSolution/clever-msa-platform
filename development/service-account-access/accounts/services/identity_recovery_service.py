from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import EmailCredential, Identity, IdentityLoginMethod, PasswordCredential
from accounts.services.identity_consent_service import IdentityConsentService
from accounts.services.identity_lifecycle_service import IdentityLifecycleService


class IdentityRecoveryService:
    def recover_with_email_password(
        self,
        *,
        name: str,
        birth_date,
        email: str,
        password: str,
        privacy_policy_version: str,
        location_policy_version: str,
    ) -> Identity:
        if EmailCredential.objects.filter(email=email).exists():
            raise ValidationError({"email": ["Email is already connected to another identity."]})

        identities = list(
            Identity.objects.filter(
                name=name,
                birth_date=birth_date,
                status=Identity.Status.ARCHIVED,
            )
        )
        if not identities:
            raise ValidationError({"identity": ["Archived identity not found."]})
        if len(identities) > 1:
            raise ValidationError({"identity": ["Multiple archived identities matched."]})

        identity = identities[0]
        if identity.system_admin_accounts.exists():
            raise ValidationError({"identity": ["System admin identity cannot use self-recovery."]})

        now = timezone.now()
        with transaction.atomic():
            IdentityLifecycleService().recover_identity(identity)
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
            PasswordCredential.objects.update_or_create(
                identity=identity,
                defaults={"password_hash": make_password(password)},
            )
            IdentityConsentService().recover(
                identity,
                privacy_policy_version=privacy_policy_version,
                location_policy_version=location_policy_version,
            )
        return identity
