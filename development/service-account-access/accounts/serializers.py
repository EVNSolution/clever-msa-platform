from rest_framework import serializers

from accounts.models import Account, EmailCredential, IdentitySignupRequest
from accounts.services.signup_intake_service import SignupIntakeService


class AccountSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Account
        fields = ("account_id", "route_no", "email", "role", "is_active")


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class IdentitySignupRequestSummarySerializer(serializers.ModelSerializer):
    request_display_name = serializers.SerializerMethodField()
    status_message = serializers.SerializerMethodField()

    class Meta:
        model = IdentitySignupRequest
        fields = (
            "identity_signup_request_id",
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
            return "설정 중입니다."
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
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    company_id = serializers.UUIDField()
    request_types = serializers.ListField(
        child=serializers.ChoiceField(choices=IdentitySignupRequest.RequestType.choices),
        allow_empty=False,
    )
    privacy_policy_version = serializers.CharField(max_length=32)
    privacy_policy_consented = serializers.BooleanField()
    location_policy_version = serializers.CharField(max_length=32)
    location_policy_consented = serializers.BooleanField()

    def validate_email(self, value):
        if EmailCredential.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email is already connected to another identity.")
        return value

    def validate_request_types(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate request types are not allowed.")
        return value

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

    def create(self, validated_data):
        return SignupIntakeService().create_signup(validated_data)


class AuthSessionSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    account = AccountSerializer()


class StatusMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if Account.objects.filter(email=value).exists():
            raise serializers.ValidationError("Account with this email already exists.")
        return value

    def create(self, validated_data):
        account = Account(email=validated_data["email"], role=Account.Role.USER, is_active=True)
        account.set_password(validated_data["password"])
        account.save()
        return account


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        account = self.context["account"]
        current_password = attrs["current_password"]
        new_password = attrs["new_password"]

        if not account.check_password(current_password):
            raise serializers.ValidationError(
                {"current_password": ["Current password is incorrect."]}
            )
        if current_password == new_password:
            raise serializers.ValidationError(
                {"new_password": ["New password must differ from current password."]}
            )
        return attrs

    def save(self, **kwargs):
        account = self.context["account"]
        account.set_password(self.validated_data["new_password"])
        account.save()
        return account


class AccountDriverLinkSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()

    def validate_account_id(self, value):
        if not Account.objects.filter(account_id=value).exists():
            raise serializers.ValidationError("Account not found.")
        return value


class AccountDriverLinkResultSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()


class AccountWriteSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    role = serializers.ChoiceField(choices=Account.Role.choices, required=False)
    is_active = serializers.BooleanField(required=False)

    def validate_email(self, value):
        instance = getattr(self, "instance", None)
        query = Account.objects.filter(email=value)
        if instance is not None:
            query = query.exclude(account_id=instance.account_id)
        if query.exists():
            raise serializers.ValidationError("Account with this email already exists.")
        return value

    def validate(self, attrs):
        if self.instance is None and "email" not in attrs:
            raise serializers.ValidationError({"email": ["This field is required."]})
        if self.instance is None and "password" not in attrs:
            raise serializers.ValidationError({"password": ["This field is required."]})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        account = Account(**validated_data)
        account.set_password(password)
        account.save()
        return account

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
