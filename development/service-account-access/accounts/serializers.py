from rest_framework import serializers

from django.contrib.auth.hashers import check_password

from accounts.models import (
    CompanyManagerRole,
    DriverAccount,
    DriverAccountLink,
    EmailCredential,
    Identity,
    IdentityConsentCurrent,
    IdentityConsentHistory,
    IdentityLoginMethod,
    IdentityProfileHistory,
    IdentitySignupRequest,
    ManagerAccount,
    PasswordCredential,
    PhoneCredential,
    SocialCredential,
)
from accounts.services.identity_login_method_service import IdentityLoginMethodService
from accounts.services.social_provider_service import SocialProviderService
from accounts.services.signup_intake_service import SignupIntakeService
from accounts.services.signup_request_service import SignupRequestService
from accounts.services.organization_tenant_lookup_client import OrganizationTenantLookupClient


def resolve_manager_role_display_name(company_id, role_type: str | None) -> str | None:
    if not role_type:
        return None

    company_role = None
    if company_id is not None:
        company_role = CompanyManagerRole.objects.filter(
            company_id=company_id,
            code=role_type,
            is_active=True,
        ).first()
    if company_role is not None:
        return company_role.display_name
    return dict(ManagerAccount.RoleType.choices).get(role_type, role_type)


PASSWORD_POLICY_MESSAGE = (
    "Password must include at least one uppercase letter, one lowercase letter, and one symbol."
)


def validate_password_policy_or_raise(password: str, *, field_name: str) -> None:
    has_uppercase = any(char.isupper() for char in password)
    has_lowercase = any(char.islower() for char in password)
    has_symbol = any(not char.isalnum() for char in password)
    if has_uppercase and has_lowercase and has_symbol:
        return
    raise serializers.ValidationError({field_name: [PASSWORD_POLICY_MESSAGE]})


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class IdentitySummarySerializer(serializers.ModelSerializer):
    contact_phone_number = serializers.SerializerMethodField()

    class Meta:
        model = Identity
        fields = ("identity_id", "name", "birth_date", "status", "contact_phone_number")

    def get_contact_phone_number(self, obj) -> str | None:
        credential = (
            PhoneCredential.objects.filter(identity_login_method__identity=obj)
            .order_by("-verified_at")
            .first()
        )
        return credential.phone_number if credential else None


class IdentityProfileSerializer(serializers.ModelSerializer):
    contact_phone_number = serializers.SerializerMethodField()

    class Meta:
        model = Identity
        fields = ("identity_id", "name", "birth_date", "status", "contact_phone_number")
        read_only_fields = ("identity_id", "status")

    def get_contact_phone_number(self, obj) -> str | None:
        credential = (
            PhoneCredential.objects.filter(identity_login_method__identity=obj)
            .order_by("-verified_at")
            .first()
        )
        return credential.phone_number if credential else None


class IdentityProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    birth_date = serializers.DateField(required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")
        return attrs

    def save(self, **kwargs):
        identity = self.context["identity"]
        for field, value in self.validated_data.items():
            setattr(identity, field, value)
        identity.save(update_fields=[*self.validated_data.keys()])
        IdentityProfileHistory.objects.create(
            identity=identity,
            name=identity.name,
            birth_date=identity.birth_date,
        )
        return identity


class ActiveAccountSerializer(serializers.Serializer):
    account_type = serializers.CharField()
    account_id = serializers.UUIDField()
    company_id = serializers.UUIDField(required=False, allow_null=True)
    role_type = serializers.CharField(required=False, allow_null=True)
    role_display_name = serializers.CharField(required=False, allow_null=True)
    role_scope_level = serializers.CharField(required=False, allow_null=True)
    assigned_fleet_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    scope_ui_mode = serializers.CharField(required=False, allow_null=True)
    default_fleet_id = serializers.UUIDField(required=False, allow_null=True)


class ManagerAccountSummarySerializer(serializers.ModelSerializer):
    identity = IdentitySummarySerializer(read_only=True)
    role_display_name = serializers.SerializerMethodField()
    role_scope_level = serializers.SerializerMethodField()
    assigned_fleet_ids = serializers.SerializerMethodField()
    scope_ui_mode = serializers.SerializerMethodField()
    default_fleet_id = serializers.SerializerMethodField()

    class Meta:
        model = ManagerAccount
        fields = (
            "manager_account_id",
            "identity",
            "company_id",
            "role_type",
            "role_display_name",
            "role_scope_level",
            "assigned_fleet_ids",
            "scope_ui_mode",
            "default_fleet_id",
            "status",
            "created_at",
        )

    def get_role_display_name(self, obj: ManagerAccount) -> str:
        return resolve_manager_role_display_name(obj.company_id, obj.role_type)

    def get_role_scope_level(self, obj: ManagerAccount) -> str:
        resolved = getattr(obj, "resolved_role_scope_level", None)
        if resolved is not None:
            return resolved
        role = CompanyManagerRole.objects.filter(
            company_id=obj.company_id,
            code=obj.role_type,
            is_active=True,
        ).first()
        if role is not None:
            return role.scope_level
        if obj.role_type == ManagerAccount.RoleType.FLEET_MANAGER:
            return CompanyManagerRole.ScopeLevel.FLEET
        return CompanyManagerRole.ScopeLevel.COMPANY

    def get_assigned_fleet_ids(self, obj: ManagerAccount) -> list[str]:
        resolved = getattr(obj, "resolved_assigned_fleet_ids", None)
        if resolved is not None:
            return resolved
        return [
            str(fleet_id)
            for fleet_id in obj.fleet_assignments.values_list("fleet_id", flat=True)
        ]

    def get_scope_ui_mode(self, obj: ManagerAccount) -> str:
        resolved = getattr(obj, "resolved_scope_ui_mode", None)
        if resolved is not None:
            return resolved
        if self.get_role_scope_level(obj) == CompanyManagerRole.ScopeLevel.COMPANY:
            return "company_selectable"
        if len(self.get_assigned_fleet_ids(obj)) == 1:
            return "fleet_fixed_single"
        return "fleet_selectable_multi"

    def get_default_fleet_id(self, obj: ManagerAccount) -> str | None:
        resolved = getattr(obj, "resolved_default_fleet_id", None)
        if resolved is not None:
            return resolved
        if self.get_scope_ui_mode(obj) != "fleet_fixed_single":
            return None
        return self.get_assigned_fleet_ids(obj)[0]


class ManagerAccountListSerializer(serializers.Serializer):
    accounts = ManagerAccountSummarySerializer(many=True)


class ManagerAccountRoleChangeSerializer(serializers.Serializer):
    role_type = serializers.CharField()
    fleet_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class DriverAccountSummarySerializer(serializers.ModelSerializer):
    identity = IdentitySummarySerializer(read_only=True)
    active_driver_id = serializers.SerializerMethodField()

    class Meta:
        model = DriverAccount
        fields = (
            "driver_account_id",
            "identity",
            "company_id",
            "status",
            "created_at",
            "active_driver_id",
        )

    def get_active_driver_id(self, obj):
        active_link = obj.driver_links.filter(unlinked_at__isnull=True).order_by("-linked_at").first()
        if active_link is None:
            return None
        return str(active_link.driver_id)


class DriverAccountListSerializer(serializers.Serializer):
    accounts = DriverAccountSummarySerializer(many=True)


class DriverAccountLinkCreateSerializer(serializers.Serializer):
    driver_account_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()


class IdentitySignupRequestSummarySerializer(serializers.ModelSerializer):
    request_display_name = serializers.SerializerMethodField()
    status_message = serializers.SerializerMethodField()
    identity = IdentitySummarySerializer(read_only=True)

    class Meta:
        model = IdentitySignupRequest
        fields = (
            "identity_signup_request_id",
            "identity",
            "request_type",
            "request_display_name",
            "status",
            "status_message",
            "company_id",
            "requested_at",
        )

    def get_request_display_name(self, obj) -> str:
        if obj.is_re_request:
            return "회사 변경 요청"
        if obj.request_type == IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE:
            return "관리자 계정 신청"
        return "배송원 계정 신청"

    def get_status_message(self, obj) -> str:
        if obj.status == IdentitySignupRequest.Status.PENDING:
            return "검토 중입니다."
        if obj.status == IdentitySignupRequest.Status.AWAITING_SETUP:
            return "관리자 유형 선택 필요"
        if obj.status == IdentitySignupRequest.Status.APPROVED:
            return "승인되어 사용할 수 있습니다."
        return "반려되었습니다."


class IdentitySignupIntakeResultSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField(source="identity.identity_id")
    name = serializers.CharField(source="identity.name")
    birth_date = serializers.DateField(source="identity.birth_date")
    status = serializers.CharField(source="identity.status")
    requests = IdentitySignupRequestSummarySerializer(many=True)


class IdentitySignupIntakeSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    birth_date = serializers.DateField()
    email = serializers.EmailField(required=False)
    contact_phone_number = serializers.CharField(max_length=32, required=False)
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    provider_type = serializers.ChoiceField(
        choices=SocialCredential.ProviderType.choices,
        required=False,
    )
    provider_access_token = serializers.CharField(write_only=True, required=False)
    company_id = serializers.UUIDField(required=False)
    tenant_code = serializers.SlugField(required=False)
    request_types = serializers.ListField(
        child=serializers.ChoiceField(choices=IdentitySignupRequest.RequestType.choices),
        allow_empty=False,
    )
    privacy_policy_version = serializers.CharField(max_length=32)
    privacy_policy_consented = serializers.BooleanField()
    location_policy_version = serializers.CharField(max_length=32)
    location_policy_consented = serializers.BooleanField()

    def validate_request_types(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate request types are not allowed.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}

        # Resolve tenant_code to company_id if provided
        tenant_code = attrs.get("tenant_code")
        if tenant_code and not attrs.get("company_id"):
            try:
                tenant_info = OrganizationTenantLookupClient().resolve_tenant(tenant_code)
                attrs["company_id"] = tenant_info["company_id"]
            except Exception as exc:
                errors["tenant_code"] = [str(exc)]

        if not attrs.get("company_id"):
            errors["company_id"] = ["Company ID or tenant code is required."]

        if not attrs["privacy_policy_consented"]:
            errors["privacy_policy_consented"] = ["Privacy policy consent is required."]
        if not attrs["location_policy_consented"]:
            errors["location_policy_consented"] = ["Location policy consent is required."]

        email = attrs.get("email")
        password = attrs.get("password")
        has_phone_number = bool(getattr(self, "initial_data", {}).get("phone_number"))
        has_social = bool(attrs.get("provider_type") or attrs.get("provider_access_token"))
        has_password_signup = bool(email or password or has_phone_number)

        if has_password_signup and has_social:
            errors["non_field_errors"] = [
                "Choose either email/password or social signup."
            ]
        elif has_password_signup:
            if has_phone_number:
                errors["phone_number"] = ["Phone signup is not supported."]
            if not password:
                errors["password"] = ["Password is required."]
            else:
                try:
                    validate_password_policy_or_raise(password, field_name="password")
                except serializers.ValidationError as exc:
                    errors.update(exc.detail)
            if email:
                if EmailCredential.objects.filter(email=email).exists():
                    errors["email"] = ["Email is already connected to another identity."]
            elif not has_phone_number:
                errors["email"] = ["Email is required."]
        elif has_social:
            if not attrs.get("provider_type"):
                errors["provider_type"] = ["Provider type is required."]
            if not attrs.get("provider_access_token"):
                errors["provider_access_token"] = ["Provider access token is required."]
            if not errors:
                social_identity = SocialProviderService().resolve_subject(
                    provider_type=attrs["provider_type"],
                    access_token=attrs["provider_access_token"],
                )
                if SocialCredential.objects.filter(
                    provider_type=social_identity["provider_type"],
                    provider_subject=social_identity["provider_subject"],
                ).exists():
                    errors["provider_access_token"] = [
                        "Social account is already connected to another identity."
                    ]
                else:
                    attrs["resolved_social_identity"] = social_identity
        else:
            errors["non_field_errors"] = [
                "Email/password or social provider access token is required."
            ]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        return SignupIntakeService().create_signup(validated_data)

class IdentityAuthSessionSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    session_kind = serializers.CharField()
    email = serializers.CharField()
    identity = IdentitySummarySerializer()
    active_account = ActiveAccountSerializer(allow_null=True)
    available_account_types = serializers.ListField(child=serializers.CharField())


class WorkspaceBootstrapSerializer(serializers.Serializer):
    company_id = serializers.UUIDField(allow_null=True)
    company_name = serializers.CharField(allow_null=True)
    tenant_code = serializers.CharField(allow_null=True)
    workflow_profile = serializers.CharField()
    enabled_features = serializers.ListField(child=serializers.CharField())
    home_dashboard_preset = serializers.DictField()
    workspace_presets = serializers.DictField()


class StatusMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class IdentityLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True, required=False)
    provider_type = serializers.ChoiceField(
        choices=SocialCredential.ProviderType.choices,
        required=False,
    )
    provider_access_token = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        identifier = attrs.get("identifier")
        email = attrs.get("email")
        password = attrs.get("password")
        has_identifier_password = bool(identifier or email or password)
        has_social = bool(attrs.get("provider_type") or attrs.get("provider_access_token"))

        errors = {}
        if has_identifier_password and has_social:
            errors["non_field_errors"] = [
                "Choose either identifier/password login or social login."
            ]
        elif has_identifier_password:
            if identifier and email:
                errors["non_field_errors"] = [
                    "Choose either identifier/password login or email/password login."
                ]
            resolved_identifier = identifier or email
            if not resolved_identifier:
                errors["identifier"] = ["Identifier is required."]
            if not password:
                errors["password"] = ["Password is required."]
            attrs["identifier"] = resolved_identifier
            attrs["login_type"] = "identifier_password"
        elif has_social:
            if not attrs.get("provider_type"):
                errors["provider_type"] = ["Provider type is required."]
            if not attrs.get("provider_access_token"):
                errors["provider_access_token"] = ["Provider access token is required."]
            if not errors:
                attrs["resolved_social_identity"] = SocialProviderService().resolve_subject(
                    provider_type=attrs["provider_type"],
                    access_token=attrs["provider_access_token"],
                )
                attrs["login_type"] = "social"
        else:
            errors["non_field_errors"] = [
                "Email/password or social provider access token is required."
            ]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class SignupRequestListSerializer(serializers.Serializer):
    identity = IdentitySummarySerializer()
    requests = IdentitySignupRequestSummarySerializer(many=True)
    inquiry_message = serializers.CharField(allow_blank=True)


class IdentitySignupRequestCreateSerializer(serializers.Serializer):
    company_id = serializers.UUIDField()
    request_type = serializers.ChoiceField(choices=IdentitySignupRequest.RequestType.choices)
    is_re_request = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        SignupRequestService().validate_creatable_request(
            self.context["identity"],
            company_id=attrs["company_id"],
            request_type=attrs["request_type"],
            is_re_request=attrs["is_re_request"],
        )
        return attrs

    def create(self, validated_data):
        return SignupRequestService().create_request(
            self.context["identity"],
            company_id=validated_data["company_id"],
            request_type=validated_data["request_type"],
            is_re_request=validated_data["is_re_request"],
        )


class SignupRequestActionSerializer(serializers.Serializer):
    reject_reason = serializers.CharField(required=False, allow_blank=False)


class SignupRequestApproveSerializer(serializers.Serializer):
    role_type = serializers.CharField(required=False)
    fleet_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class NavigationPolicyCurrentSerializer(serializers.Serializer):
    allowed_nav_keys = serializers.ListField(child=serializers.CharField())
    source = serializers.CharField()


class CompanyManagerRoleSerializer(serializers.Serializer):
    company_manager_role_id = serializers.UUIDField()
    company_id = serializers.UUIDField()
    code = serializers.CharField()
    display_name = serializers.CharField()
    display_order = serializers.IntegerField()
    scope_level = serializers.ChoiceField(choices=CompanyManagerRole.ScopeLevel.choices)
    is_system_required = serializers.BooleanField()
    is_default = serializers.BooleanField()
    allowed_nav_keys = serializers.ListField(child=serializers.CharField())
    assigned_count = serializers.IntegerField()
    can_delete = serializers.BooleanField()
    delete_block_reason = serializers.CharField(allow_null=True, required=False)


class CompanyManagerRoleListSerializer(serializers.Serializer):
    roles = CompanyManagerRoleSerializer(many=True)


class CompanyManagerRoleCreateSerializer(serializers.Serializer):
    company_id = serializers.UUIDField()
    display_name = serializers.CharField(max_length=120)
    scope_level = serializers.ChoiceField(choices=CompanyManagerRole.ScopeLevel.choices)


class CompanyManagerRoleUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=120, required=False)
    code = serializers.RegexField(regex=r"^[a-z][a-z0-9_]{1,63}$", required=False)
    scope_level = serializers.ChoiceField(choices=CompanyManagerRole.ScopeLevel.choices, required=False)
    allowed_nav_keys = serializers.ListField(child=serializers.CharField(), required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")
        if "allowed_nav_keys" in attrs and (
            "display_name" in attrs or "scope_level" in attrs or "code" in attrs
        ):
            raise serializers.ValidationError(
                {"allowed_nav_keys": ["Menu policy updates must be sent separately from role metadata changes."]}
            )
        return attrs


class CompanyManagerRoleReorderSerializer(serializers.Serializer):
    company_id = serializers.UUIDField()
    role_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)


class IdentityConsentCurrentSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentityConsentCurrent
        fields = (
            "privacy_policy_version",
            "privacy_policy_consented",
            "privacy_policy_consented_at",
            "location_policy_version",
            "location_policy_consented",
            "location_policy_consented_at",
        )


class IdentityConsentWithdrawSerializer(serializers.Serializer):
    consent_type = serializers.ChoiceField(choices=IdentityConsentHistory.ConsentType.choices)


class IdentityConsentRecoverSerializer(serializers.Serializer):
    privacy_policy_version = serializers.CharField(max_length=32)
    privacy_policy_consented = serializers.BooleanField()
    location_policy_version = serializers.CharField(max_length=32)
    location_policy_consented = serializers.BooleanField()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        if not attrs["privacy_policy_consented"]:
            errors["privacy_policy_consented"] = ["Privacy policy consent is required."]
        if not attrs["location_policy_consented"]:
            errors["location_policy_consented"] = ["Location policy consent is required."]
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class IdentityLoginMethodSerializer(serializers.ModelSerializer):
    value = serializers.SerializerMethodField()

    class Meta:
        model = IdentityLoginMethod
        fields = ("identity_login_method_id", "method_type", "verified_at", "value")

    def get_value(self, obj):
        if hasattr(obj, "email_credential"):
            return obj.email_credential.email
        if hasattr(obj, "phone_credential"):
            return obj.phone_credential.phone_number
        if hasattr(obj, "social_credential"):
            return {
                "provider_type": obj.social_credential.provider_type,
                "provider_subject": obj.social_credential.provider_subject,
            }
        return None


class IdentityLoginMethodListSerializer(serializers.Serializer):
    methods = IdentityLoginMethodSerializer(many=True)


class IdentityLoginMethodCreateSerializer(serializers.Serializer):
    method_type = serializers.ChoiceField(choices=IdentityLoginMethod.MethodType.choices)
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    provider_type = serializers.CharField(required=False)
    provider_subject = serializers.CharField(required=False)
    provider_access_token = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs["method_type"] == IdentityLoginMethod.MethodType.SOCIAL:
            has_provider_access_token = bool(attrs.get("provider_access_token"))
            has_provider_subject = bool(attrs.get("provider_subject"))
            if has_provider_access_token:
                if not attrs.get("provider_type"):
                    raise serializers.ValidationError({"provider_type": ["Provider type is required."]})
                attrs.update(
                    SocialProviderService().resolve_subject(
                        provider_type=attrs["provider_type"],
                        access_token=attrs["provider_access_token"],
                    )
                )
            elif not has_provider_subject:
                raise serializers.ValidationError(
                    {"provider_access_token": ["Provider access token is required."]}
                )
        IdentityLoginMethodService().ensure_creatable(
            identity=self.context["identity"],
            method_type=attrs["method_type"],
            email=attrs.get("email"),
            phone_number=attrs.get("phone_number"),
            provider_type=attrs.get("provider_type"),
            provider_subject=attrs.get("provider_subject"),
        )
        return attrs

    def create(self, validated_data):
        return IdentityLoginMethodService().create_method(
            self.context["identity"],
            method_type=validated_data["method_type"],
            email=validated_data.get("email"),
            phone_number=validated_data.get("phone_number"),
            provider_type=validated_data.get("provider_type"),
            provider_subject=validated_data.get("provider_subject"),
        )


class IdentityLoginMethodDeleteSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(required=False, default=False)
    current_password = serializers.CharField(required=False, allow_blank=False)


class IdentityRecoverySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    birth_date = serializers.DateField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    privacy_policy_version = serializers.CharField(max_length=32)
    privacy_policy_consented = serializers.BooleanField()
    location_policy_version = serializers.CharField(max_length=32)
    location_policy_consented = serializers.BooleanField()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        if not attrs["privacy_policy_consented"]:
            errors["privacy_policy_consented"] = ["Privacy policy consent is required."]
        if not attrs["location_policy_consented"]:
            errors["location_policy_consented"] = ["Location policy consent is required."]
        try:
            validate_password_policy_or_raise(attrs["password"], field_name="password")
        except serializers.ValidationError as exc:
            errors.update(exc.detail)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class IdentityPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=False, allow_blank=False)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        identity = self.context["identity"]
        password_credential = PasswordCredential.objects.filter(identity=identity).first()
        current_password = attrs.get("current_password")
        if password_credential is not None:
            if not current_password:
                raise serializers.ValidationError(
                    {"current_password": ["Current password is required."]}
                )
            if not check_password(current_password, password_credential.password_hash):
                raise serializers.ValidationError(
                    {"current_password": ["Current password is incorrect."]}
                )
        validate_password_policy_or_raise(attrs["new_password"], field_name="new_password")
        return attrs


class SignupRequestSetupSerializer(serializers.Serializer):
    role_type = serializers.CharField()
    fleet_ids = serializers.ListField(child=serializers.UUIDField(), required=False)

class DriverAccountLinkSummarySerializer(serializers.ModelSerializer):
    driver_account_id = serializers.UUIDField(source="driver_account.driver_account_id")
    identity_id = serializers.UUIDField(source="driver_account.identity.identity_id")
    identity_name = serializers.CharField(source="driver_account.identity.name")
    email = serializers.SerializerMethodField()
    account_status = serializers.CharField(source="driver_account.status")

    class Meta:
        model = DriverAccountLink
        fields = (
            "driver_account_link_id",
            "driver_account_id",
            "driver_id",
            "identity_id",
            "identity_name",
            "email",
            "account_status",
            "linked_at",
            "unlinked_at",
        )

    def get_email(self, obj):
        credential = (
            EmailCredential.objects.select_related("identity_login_method")
            .filter(
                identity_login_method__identity=obj.driver_account.identity,
                identity_login_method__archived_at__isnull=True,
                identity_login_method__verified_at__isnull=False,
                verified_at__isnull=False,
            )
            .order_by("identity_login_method__identity_login_method_id")
            .first()
        )
        if credential is None:
            return None
        return credential.email
