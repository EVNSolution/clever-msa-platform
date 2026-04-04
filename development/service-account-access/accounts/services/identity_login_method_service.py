from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import (
    EmailCredential,
    IdentityLoginMethod,
    PhoneCredential,
    SocialCredential,
)
from accounts.services.legacy_account_projection_service import LegacyAccountProjectionService
from accounts.services.identity_lifecycle_service import IdentityLifecycleService


class IdentityLoginMethodService:
    def create_method(self, identity, *, method_type: str, email=None, phone_number=None, provider_type=None, provider_subject=None):
        now = timezone.now()
        with transaction.atomic():
            login_method = IdentityLoginMethod.objects.create(
                identity=identity,
                method_type=method_type,
                verified_at=now,
            )
            if method_type == IdentityLoginMethod.MethodType.EMAIL:
                EmailCredential.objects.create(
                    identity_login_method=login_method,
                    email=email,
                    verified_at=now,
                )
            elif method_type == IdentityLoginMethod.MethodType.PHONE:
                PhoneCredential.objects.create(
                    identity_login_method=login_method,
                    phone_number=phone_number,
                    verified_at=now,
                )
            else:
                SocialCredential.objects.create(
                    identity_login_method=login_method,
                    provider_type=provider_type,
                    provider_subject=provider_subject,
                    verified_at=now,
                )
        LegacyAccountProjectionService().sync_identity(identity)
        return login_method

    def delete_method(self, identity, login_method, *, confirm: bool, current_password: str | None):
        active_methods = identity.login_methods.filter(archived_at__isnull=True)
        if active_methods.count() == 1:
            IdentityLifecycleService().validate_last_method_deletion(
                identity,
                confirm=confirm,
                current_password=current_password,
            )
            IdentityLifecycleService().archive_identity(identity)
            return "archived"

        login_method.delete()
        LegacyAccountProjectionService().sync_identity(identity)
        return "deleted"

    def ensure_creatable(self, *, identity, method_type: str, email=None, phone_number=None, provider_type=None, provider_subject=None):
        if method_type == IdentityLoginMethod.MethodType.EMAIL:
            if not email:
                raise ValidationError({"email": ["Email is required."]})
            if EmailCredential.objects.filter(email=email).exclude(identity_login_method__identity=identity).exists():
                raise ValidationError({"email": ["Email is already connected to another identity."]})
            return

        if method_type == IdentityLoginMethod.MethodType.PHONE:
            if not phone_number:
                raise ValidationError({"phone_number": ["Phone number is required."]})
            if PhoneCredential.objects.filter(phone_number=phone_number).exclude(identity_login_method__identity=identity).exists():
                raise ValidationError({"phone_number": ["Phone number is already connected to another identity."]})
            return

        if not provider_type:
            raise ValidationError({"provider_type": ["Provider type is required."]})
        if not provider_subject:
            raise ValidationError({"provider_subject": ["Provider subject is required."]})
        if SocialCredential.objects.filter(
            provider_type=provider_type,
            provider_subject=provider_subject,
        ).exclude(identity_login_method__identity=identity).exists():
            raise ValidationError({"provider_subject": ["Social account is already connected to another identity."]})
