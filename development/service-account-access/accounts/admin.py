from django.contrib import admin

from accounts.models import (
    CompanyManagerRole,
    DriverAccount,
    DriverAccountLink,
    EmailCredential,
    Identity,
    IdentityAccountLink,
    IdentityConsentCurrent,
    IdentityConsentHistory,
    IdentityLoginMethod,
    IdentityProfileHistory,
    IdentitySignupRequest,
    ManagerAccount,
    ManagerAccountFleetAssignment,
    PasswordCredential,
    PhoneCredential,
    SocialCredential,
    SystemAdminAccount,
)


@admin.register(Identity)
class IdentityAdmin(admin.ModelAdmin):
    list_display = ("identity_id", "name", "birth_date", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("name", "identity_id")
    ordering = ("-created_at",)


@admin.register(IdentityLoginMethod)
class IdentityLoginMethodAdmin(admin.ModelAdmin):
    list_display = ("identity_login_method_id", "identity", "method_type", "verified_at", "archived_at")
    list_filter = ("method_type", "verified_at")
    search_fields = ("identity__name", "identity_login_method_id")


@admin.register(EmailCredential)
class EmailCredentialAdmin(admin.ModelAdmin):
    list_display = ("email", "identity_login_method", "verified_at")
    search_fields = ("email", "identity_login_method__identity__name")


@admin.register(PhoneCredential)
class PhoneCredentialAdmin(admin.ModelAdmin):
    list_display = ("phone_number", "identity_login_method", "verified_at")
    search_fields = ("phone_number", "identity_login_method__identity__name")


@admin.register(SocialCredential)
class SocialCredentialAdmin(admin.ModelAdmin):
    list_display = ("provider_type", "provider_subject", "identity_login_method", "verified_at")
    list_filter = ("provider_type",)
    search_fields = ("provider_subject", "identity_login_method__identity__name")


@admin.register(PasswordCredential)
class PasswordCredentialAdmin(admin.ModelAdmin):
    list_display = ("password_credential_id", "identity", "updated_at")
    readonly_fields = ("password_hash", "updated_at")
    search_fields = ("identity__name", "password_credential_id")


@admin.register(SystemAdminAccount)
class SystemAdminAccountAdmin(admin.ModelAdmin):
    list_display = ("system_admin_account_id", "identity", "status", "created_at", "archived_at")
    list_filter = ("status",)
    search_fields = ("identity__name", "system_admin_account_id")


@admin.register(ManagerAccount)
class ManagerAccountAdmin(admin.ModelAdmin):
    list_display = ("manager_account_id", "identity", "company_id", "role_type", "status", "created_at")
    list_filter = ("status", "role_type")
    search_fields = ("identity__name", "manager_account_id", "company_id")


@admin.register(CompanyManagerRole)
class CompanyManagerRoleAdmin(admin.ModelAdmin):
    list_display = ("company_manager_role_id", "company_id", "code", "display_name", "scope_level", "is_active")
    list_filter = ("scope_level", "is_active", "is_default", "is_system_required")
    search_fields = ("code", "display_name", "company_id")
    ordering = ("company_id", "display_order", "created_at")


@admin.register(ManagerAccountFleetAssignment)
class ManagerAccountFleetAssignmentAdmin(admin.ModelAdmin):
    list_display = ("manager_account_fleet_assignment_id", "manager_account", "company_id", "fleet_id", "assigned_at")
    search_fields = ("manager_account__identity__name", "company_id", "fleet_id")


@admin.register(DriverAccount)
class DriverAccountAdmin(admin.ModelAdmin):
    list_display = ("driver_account_id", "identity", "company_id", "status", "created_at", "archived_at")
    list_filter = ("status",)
    search_fields = ("identity__name", "driver_account_id", "company_id")


@admin.register(IdentitySignupRequest)
class IdentitySignupRequestAdmin(admin.ModelAdmin):
    list_display = ("identity_signup_request_id", "identity", "request_type", "company_id", "status", "requested_at")
    list_filter = ("request_type", "status")
    search_fields = ("identity__name", "identity_signup_request_id", "company_id")
    ordering = ("-requested_at",)


@admin.register(IdentityAccountLink)
class IdentityAccountLinkAdmin(admin.ModelAdmin):
    list_display = ("identity_account_link_id", "identity", "account_type", "account_id", "linked_at")
    list_filter = ("account_type",)
    search_fields = ("identity__name", "identity_account_link_id", "account_id")


@admin.register(DriverAccountLink)
class DriverAccountLinkAdmin(admin.ModelAdmin):
    list_display = ("driver_account_link_id", "driver_account", "driver_id", "linked_at", "unlinked_at")
    search_fields = ("driver_account__identity__name", "driver_account_link_id", "driver_id")


@admin.register(IdentityConsentCurrent)
class IdentityConsentCurrentAdmin(admin.ModelAdmin):
    list_display = (
        "identity",
        "privacy_policy_version",
        "privacy_policy_consented_at",
        "location_policy_version",
        "location_policy_consented_at",
    )
    search_fields = ("identity__name", "identity__identity_id")


@admin.register(IdentityConsentHistory)
class IdentityConsentHistoryAdmin(admin.ModelAdmin):
    list_display = ("identity_consent_history_id", "identity", "consent_type", "is_consented", "changed_at")
    list_filter = ("consent_type", "is_consented")
    search_fields = ("identity__name", "identity_consent_history_id")
    ordering = ("-changed_at",)


@admin.register(IdentityProfileHistory)
class IdentityProfileHistoryAdmin(admin.ModelAdmin):
    list_display = ("identity_profile_history_id", "identity", "name", "birth_date", "changed_at")
    search_fields = ("identity__name", "identity_profile_history_id", "name")
    ordering = ("-changed_at",)
