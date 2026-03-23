from rest_framework import serializers

from accounts.models import Account


class AccountSerializer(serializers.ModelSerializer):
    account_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Account
        fields = ("account_id", "email", "role", "is_active")


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
