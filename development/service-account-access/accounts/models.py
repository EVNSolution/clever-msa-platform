import uuid
import secrets

from django.contrib.auth.hashers import check_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction
from django.db.models import Max, Q


def generate_account_public_ref() -> str:
    return f"acc_{secrets.token_hex(8)}"


class Identity(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    identity_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    birth_date = models.DateField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("name", "identity_id")

    def __str__(self) -> str:
        return self.name


class IdentityLoginMethod(models.Model):
    class MethodType(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"
        SOCIAL = "social", "Social"

    identity_login_method_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="login_methods",
    )
    method_type = models.CharField(max_length=16, choices=MethodType.choices)
    verified_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("identity_id", "method_type", "identity_login_method_id")


class EmailCredential(models.Model):
    email_credential_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity_login_method = models.OneToOneField(
        IdentityLoginMethod,
        on_delete=models.CASCADE,
        related_name="email_credential",
    )
    email = models.EmailField(unique=True)
    verified_at = models.DateTimeField(null=True, blank=True)


class PhoneCredential(models.Model):
    phone_credential_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity_login_method = models.OneToOneField(
        IdentityLoginMethod,
        on_delete=models.CASCADE,
        related_name="phone_credential",
    )
    phone_number = models.CharField(max_length=32, unique=True)
    verified_at = models.DateTimeField(null=True, blank=True)


class SocialCredential(models.Model):
    class ProviderType(models.TextChoices):
        KAKAO = "kakao", "Kakao"
        APPLE = "apple", "Apple"
        GOOGLE = "google", "Google"

    social_credential_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity_login_method = models.OneToOneField(
        IdentityLoginMethod,
        on_delete=models.CASCADE,
        related_name="social_credential",
    )
    provider_type = models.CharField(max_length=16, choices=ProviderType.choices)
    provider_subject = models.CharField(max_length=255)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("provider_type", "provider_subject"),
                name="uniq_social_provider_subject",
            )
        ]


class PasswordCredential(models.Model):
    password_credential_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.OneToOneField(
        Identity,
        on_delete=models.CASCADE,
        related_name="password_credential",
    )
    password_hash = models.CharField(max_length=128)
    updated_at = models.DateTimeField(auto_now=True)


class SystemAdminAccount(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    system_admin_account_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="system_admin_accounts",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("identity",),
                condition=Q(status="active"),
                name="uniq_active_system_admin_per_identity",
            )
        ]


class ManagerAccount(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    class RoleType(models.TextChoices):
        COMPANY_SUPER_ADMIN = "company_super_admin", "Company Super Admin"
        VEHICLE_MANAGER = "vehicle_manager", "Vehicle Manager"
        SETTLEMENT_MANAGER = "settlement_manager", "Settlement Manager"
        FLEET_MANAGER = "fleet_manager", "Fleet Manager"

    manager_account_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="manager_accounts",
    )
    company_id = models.UUIDField()
    role_type = models.CharField(max_length=32, choices=RoleType.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("identity",),
                condition=Q(status="active"),
                name="uniq_active_manager_account_per_identity",
            )
        ]

    def clean(self):
        errors = {}
        if self.status == self.Status.ACTIVE:
            duplicate = type(self).objects.filter(identity=self.identity, status=self.Status.ACTIVE)
            if self.pk:
                duplicate = duplicate.exclude(pk=self.pk)
            if duplicate.exists():
                errors["identity"] = "Identity already has an active manager account."

            driver_account = DriverAccount.objects.filter(
                identity=self.identity,
                status=DriverAccount.Status.ACTIVE,
            ).first()
            if driver_account is not None and driver_account.company_id != self.company_id:
                errors["company_id"] = "Active manager and driver accounts must share the same company."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class ManagerNavigationPolicy(models.Model):
    class Action(models.TextChoices):
        VIEW = "view", "View"

    class Effect(models.TextChoices):
        ALLOW = "allow", "Allow"
        DENY = "deny", "Deny"

    manager_navigation_policy_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField(null=True, blank=True)
    manager_role = models.CharField(max_length=32, choices=ManagerAccount.RoleType.choices)
    nav_item_key = models.CharField(max_length=64)
    action = models.CharField(max_length=32, choices=Action.choices, default=Action.VIEW)
    effect = models.CharField(max_length=16, choices=Effect.choices, default=Effect.ALLOW)
    updated_by_identity_id = models.UUIDField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("company_id", "manager_role", "nav_item_key", "action")
        constraints = [
            models.UniqueConstraint(
                fields=("manager_role", "nav_item_key", "action"),
                condition=Q(company_id__isnull=True),
                name="uniq_global_manager_navigation_policy_role_key_action",
            ),
            models.UniqueConstraint(
                fields=("company_id", "manager_role", "nav_item_key", "action"),
                condition=Q(company_id__isnull=False),
                name="uniq_company_manager_navigation_policy_role_key_action",
            )
        ]


class DriverAccount(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    driver_account_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="driver_accounts",
    )
    company_id = models.UUIDField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("identity",),
                condition=Q(status="active"),
                name="uniq_active_driver_account_per_identity",
            )
        ]

    def clean(self):
        errors = {}
        if self.status == self.Status.ACTIVE:
            duplicate = type(self).objects.filter(identity=self.identity, status=self.Status.ACTIVE)
            if self.pk:
                duplicate = duplicate.exclude(pk=self.pk)
            if duplicate.exists():
                errors["identity"] = "Identity already has an active driver account."

            manager_account = ManagerAccount.objects.filter(
                identity=self.identity,
                status=ManagerAccount.Status.ACTIVE,
            ).first()
            if manager_account is not None and manager_account.company_id != self.company_id:
                errors["company_id"] = "Active manager and driver accounts must share the same company."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class IdentitySignupRequest(models.Model):
    class RequestType(models.TextChoices):
        MANAGER_ACCOUNT_CREATE = "manager_account_create", "Manager Account Create"
        DRIVER_ACCOUNT_CREATE = "driver_account_create", "Driver Account Create"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        AWAITING_SETUP = "awaiting_setup", "Awaiting Setup"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    identity_signup_request_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="signup_requests",
    )
    company_id = models.UUIDField()
    request_type = models.CharField(max_length=32, choices=RequestType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_re_request = models.BooleanField(default=False)
    from_company_id = models.UUIDField(null=True, blank=True)
    reviewed_by_system_admin_account = models.ForeignKey(
        SystemAdminAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_signup_requests",
    )
    reviewed_by_manager_account = models.ForeignKey(
        ManagerAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_signup_requests",
    )
    reject_reason = models.CharField(max_length=64, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("identity", "company_id", "request_type"),
                condition=Q(status="pending"),
                name="uniq_pending_signup_request_per_scope",
            )
        ]

    def clean(self):
        if (
            self.request_type == self.RequestType.DRIVER_ACCOUNT_CREATE
            and self.status == self.Status.AWAITING_SETUP
        ):
            raise ValidationError(
                {"status": "Driver account requests cannot stay in awaiting_setup status."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class IdentityAccountLink(models.Model):
    class AccountType(models.TextChoices):
        SYSTEM_ADMIN = "system_admin", "System Admin"
        MANAGER = "manager", "Manager"
        DRIVER = "driver", "Driver"

    identity_account_link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="account_links",
    )
    account_type = models.CharField(max_length=16, choices=AccountType.choices)
    account_id = models.UUIDField()
    linked_at = models.DateTimeField(auto_now_add=True)
    unlinked_at = models.DateTimeField(null=True, blank=True)


class DriverAccountLink(models.Model):
    driver_account_link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver_account = models.ForeignKey(
        DriverAccount,
        on_delete=models.CASCADE,
        related_name="driver_links",
    )
    driver_id = models.UUIDField()
    linked_at = models.DateTimeField(auto_now_add=True)
    unlinked_at = models.DateTimeField(null=True, blank=True)
    unlink_reason = models.CharField(max_length=64, blank=True)


class IdentityConsentCurrent(models.Model):
    identity = models.OneToOneField(
        Identity,
        on_delete=models.CASCADE,
        related_name="consent_current",
    )
    privacy_policy_version = models.CharField(max_length=32)
    privacy_policy_consented = models.BooleanField(default=True)
    privacy_policy_consented_at = models.DateTimeField()
    location_policy_version = models.CharField(max_length=32)
    location_policy_consented = models.BooleanField(default=True)
    location_policy_consented_at = models.DateTimeField()


class IdentityConsentHistory(models.Model):
    class ConsentType(models.TextChoices):
        PRIVACY_POLICY = "privacy_policy", "Privacy Policy"
        LOCATION_POLICY = "location_policy", "Location Policy"

    identity_consent_history_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="consent_history",
    )
    consent_type = models.CharField(max_length=32, choices=ConsentType.choices)
    version = models.CharField(max_length=32)
    is_consented = models.BooleanField(default=True)
    changed_at = models.DateTimeField(auto_now_add=True)


class IdentityProfileHistory(models.Model):
    identity_profile_history_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        Identity,
        on_delete=models.CASCADE,
        related_name="profile_history",
    )
    name = models.CharField(max_length=120)
    birth_date = models.DateField()
    changed_at = models.DateTimeField(auto_now_add=True)
