from rest_framework import serializers

from dispatch.exceptions import ServiceUnavailableError
from dispatch.models import (
    DispatchAssignment,
    DispatchUploadBatch,
    DispatchUploadRow,
    DispatchPlan,
    DispatchWorkRule,
    DriverDayException,
    OutsourcedDriver,
    VehicleSchedule,
)
from dispatch.services.dispatch_rule_service import DispatchRuleService, DispatchRuleViolation
from dispatch.services.source_clients import SourceClients, SourceNotFoundError, SourceServiceError

DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def _merged_attributes(instance, attrs):
    if instance is None:
        return dict(attrs)
    merged = {}
    for field in instance._meta.fields:
        if field.auto_created:
            continue
        merged[field.name] = getattr(instance, field.name)
    merged.update(attrs)
    return merged


def _validate_model_instance(model_cls, attrs, *, instance=None):
    merged = _merged_attributes(instance, attrs)
    if instance is None:
        candidate = model_cls(**merged)
    else:
        candidate = instance
        for key, value in merged.items():
            setattr(candidate, key, value)
    candidate.full_clean()
    return attrs


class DispatchPlanSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = DispatchPlan
        fields = (
            "dispatch_plan_id",
            "company_id",
            "fleet_id",
            "dispatch_date",
            "planned_volume",
            "dispatch_status",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        try:
            return _validate_model_instance(DispatchPlan, attrs, instance=self.instance)
        except Exception as exc:
            if isinstance(exc, serializers.ValidationError):
                raise
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class VehicleScheduleSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = VehicleSchedule
        fields = (
            "vehicle_schedule_id",
            "vehicle_id",
            "fleet_id",
            "dispatch_date",
            "shift_slot",
            "schedule_status",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        try:
            return _validate_model_instance(VehicleSchedule, attrs, instance=self.instance)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class DispatchAssignmentSerializer(serializers.ModelSerializer):
    vehicle_schedule_id = serializers.PrimaryKeyRelatedField(
        queryset=VehicleSchedule.objects.all(),
        source="vehicle_schedule",
    )
    driver_id = serializers.UUIDField(allow_null=True, required=False)
    outsourced_driver_id = serializers.PrimaryKeyRelatedField(
        queryset=OutsourcedDriver.objects.all(),
        source="outsourced_driver",
        allow_null=True,
        required=False,
    )
    assigned_at = serializers.DateTimeField(format=DATETIME_FORMAT)
    unassigned_at = serializers.DateTimeField(
        format=DATETIME_FORMAT,
        allow_null=True,
        required=False,
    )
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = DispatchAssignment
        fields = (
            "dispatch_assignment_id",
            "vehicle_schedule_id",
            "vehicle_id",
            "driver_id",
            "outsourced_driver_id",
            "operator_company_id",
            "dispatch_date",
            "shift_slot",
            "assignment_status",
            "assigned_at",
            "unassigned_at",
            "created_at",
            "updated_at",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["vehicle_schedule_id"] = str(instance.vehicle_schedule_id)
        data["outsourced_driver_id"] = (
            str(instance.outsourced_driver_id) if instance.outsourced_driver_id else None
        )
        return data

    def validate(self, attrs):
        request = self.context.get("request")
        authorization = request.headers.get("Authorization", "") if request else ""
        try:
            attrs = DispatchRuleService().validate_and_normalize(
                attributes=attrs,
                authorization=authorization,
                instance=self.instance,
            )
            return _validate_model_instance(DispatchAssignment, attrs, instance=self.instance)
        except DispatchRuleViolation as exc:
            raise serializers.ValidationError(exc.details) from exc
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class OutsourcedDriverSerializer(serializers.ModelSerializer):
    dispatch_plan_id = serializers.PrimaryKeyRelatedField(
        queryset=DispatchPlan.objects.all(),
        source="dispatch_plan",
    )
    company_id = serializers.SerializerMethodField()
    fleet_id = serializers.SerializerMethodField()
    dispatch_date = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)
    archived_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    is_archivable = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = OutsourcedDriver
        fields = (
            "outsourced_driver_id",
            "dispatch_plan_id",
            "company_id",
            "fleet_id",
            "dispatch_date",
            "name",
            "contact_number",
            "vehicle_note",
            "memo",
            "status",
            "archived_at",
            "is_archivable",
            "created_at",
            "updated_at",
        )

    def get_company_id(self, instance):
        return str(instance.dispatch_plan.company_id)

    def get_fleet_id(self, instance):
        return str(instance.dispatch_plan.fleet_id)

    def get_dispatch_date(self, instance):
        return str(instance.dispatch_plan.dispatch_date)

    def get_is_archivable(self, instance):
        if instance.status != OutsourcedDriver.Status.ACTIVE:
            return False

        request = self.context.get("request")
        authorization = request.headers.get("Authorization", "") if request else ""
        cache = self.context.setdefault("_outsourced_driver_archivable_cache", {})
        cache_key = (
            str(instance.dispatch_plan.company_id),
            str(instance.dispatch_plan.fleet_id),
            str(instance.dispatch_plan.dispatch_date),
        )
        if cache_key not in cache:
            try:
                snapshots = SourceClients().list_daily_delivery_input_snapshots(
                    company_id=cache_key[0],
                    fleet_id=cache_key[1],
                    service_date=cache_key[2],
                    status="active",
                    authorization=authorization,
                )
            except SourceServiceError:
                cache[cache_key] = False
            else:
                cache[cache_key] = bool(snapshots)
        return cache[cache_key]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["dispatch_plan_id"] = str(instance.dispatch_plan_id)
        return data

    def validate(self, attrs):
        if self.instance is not None and self.instance.status != OutsourcedDriver.Status.ACTIVE:
            raise serializers.ValidationError({"status": ["Archived outsourced drivers cannot be modified."]})
        try:
            return _validate_model_instance(OutsourcedDriver, attrs, instance=self.instance)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class DispatchWorkRuleSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    is_in_use = serializers.SerializerMethodField()

    class Meta:
        model = DispatchWorkRule
        fields = (
            "work_rule_id",
            "company_id",
            "name",
            "system_kind",
            "is_in_use",
            "created_at",
            "updated_at",
        )

    def get_is_in_use(self, instance):
        count = getattr(instance, "driver_day_exception_count", None)
        if count is not None:
            return count > 0
        return instance.driver_day_exceptions.exists()

    def validate(self, attrs):
        try:
            return _validate_model_instance(DispatchWorkRule, attrs, instance=self.instance)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class DriverDayExceptionSerializer(serializers.ModelSerializer):
    work_rule_id = serializers.PrimaryKeyRelatedField(
        queryset=DispatchWorkRule.objects.all(),
        source="work_rule",
        write_only=True,
    )
    work_rule = DispatchWorkRuleSerializer(read_only=True)
    created_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DATETIME_FORMAT, read_only=True)

    class Meta:
        model = DriverDayException
        fields = (
            "driver_day_exception_id",
            "company_id",
            "fleet_id",
            "dispatch_date",
            "driver_id",
            "work_rule_id",
            "work_rule",
            "memo",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        authorization = request.headers.get("Authorization", "") if request else ""
        source_clients = SourceClients()
        company_id = str(attrs.get("company_id") or getattr(self.instance, "company_id", ""))
        fleet_id = str(attrs.get("fleet_id") or getattr(self.instance, "fleet_id", ""))
        driver_id = str(attrs.get("driver_id") or getattr(self.instance, "driver_id", ""))
        work_rule = attrs.get("work_rule") or getattr(self.instance, "work_rule", None)

        try:
            if work_rule is None:
                raise serializers.ValidationError({"work_rule_id": ["work_rule_id is required."]})
            driver = source_clients.get_driver(driver_id=driver_id, authorization=authorization)
        except SourceNotFoundError as exc:
            raise serializers.ValidationError({"driver_id": ["Unknown driver_id."]}) from exc
        except SourceServiceError as exc:
            raise ServiceUnavailableError("Driver day exception validation is unavailable.") from exc

        if str(driver.get("company_id", "")) != company_id:
            raise serializers.ValidationError(
                {"company_id": ["company_id must match the driver company."]}
            )
        if str(driver.get("fleet_id", "")) != fleet_id:
            raise serializers.ValidationError(
                {"fleet_id": ["fleet_id must match the driver fleet."]}
            )

        try:
            return _validate_model_instance(DriverDayException, attrs, instance=self.instance)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class DispatchUploadPreviewRowInputSerializer(serializers.Serializer):
    delivery_manager_name = serializers.CharField()
    small_region_text = serializers.CharField(required=False, allow_blank=True, default="")
    detailed_region_text = serializers.CharField(required=False, allow_blank=True, default="")
    box_count = serializers.IntegerField(min_value=0)
    household_count = serializers.IntegerField(min_value=0)


class DispatchUploadPreviewRequestSerializer(serializers.Serializer):
    dispatch_plan_id = serializers.PrimaryKeyRelatedField(
        queryset=DispatchPlan.objects.all(),
        source="dispatch_plan",
        required=False,
        allow_null=True,
    )
    company_id = serializers.UUIDField(required=False)
    fleet_id = serializers.UUIDField(required=False)
    dispatch_date = serializers.DateField(required=False)
    rows = DispatchUploadPreviewRowInputSerializer(many=True)
    source_filename = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        dispatch_plan = attrs.get("dispatch_plan")
        company_id = attrs.get("company_id")
        fleet_id = attrs.get("fleet_id")
        dispatch_date = attrs.get("dispatch_date")
        errors = {}

        if dispatch_plan is not None:
            company_id = company_id or dispatch_plan.company_id
            fleet_id = fleet_id or dispatch_plan.fleet_id
            dispatch_date = dispatch_date or dispatch_plan.dispatch_date
            if company_id != dispatch_plan.company_id:
                errors["company_id"] = ["company_id must match dispatch_plan.company_id."]
            if fleet_id != dispatch_plan.fleet_id:
                errors["fleet_id"] = ["fleet_id must match dispatch_plan.fleet_id."]
            if dispatch_date != dispatch_plan.dispatch_date:
                errors["dispatch_date"] = ["dispatch_date must match dispatch_plan.dispatch_date."]

        if company_id is None:
            errors["company_id"] = ["company_id is required when dispatch_plan_id is not provided."]
        if fleet_id is None:
            errors["fleet_id"] = ["fleet_id is required when dispatch_plan_id is not provided."]
        if dispatch_date is None:
            errors["dispatch_date"] = ["dispatch_date is required when dispatch_plan_id is not provided."]

        request = self.context.get("request")
        auth_payload = getattr(request, "auth", None) if request is not None else None
        if isinstance(auth_payload, dict):
            active_account_type = auth_payload.get("active_account_type")
            session_company_id = auth_payload.get("company_id")
            if active_account_type == "manager" and session_company_id:
                if company_id is not None and str(company_id) != str(session_company_id):
                    errors["company_id"] = ["company_id must match the current session company."]
                company_id = company_id or session_company_id

        if errors:
            raise serializers.ValidationError(errors)

        attrs["company_id"] = company_id
        attrs["fleet_id"] = fleet_id
        attrs["dispatch_date"] = dispatch_date
        return attrs


class DispatchUploadRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = DispatchUploadRow
        fields = (
            "upload_row_id",
            "row_index",
            "external_user_name",
            "small_region_text",
            "detailed_region_text",
            "box_count",
            "household_count",
            "matched_driver_id",
        )


class DispatchUploadBatchSerializer(serializers.ModelSerializer):
    dispatch_plan_id = serializers.UUIDField(read_only=True, allow_null=True)
    rows = DispatchUploadRowSerializer(many=True, read_only=True)

    class Meta:
        model = DispatchUploadBatch
        fields = (
            "upload_batch_id",
            "dispatch_plan_id",
            "company_id",
            "fleet_id",
            "dispatch_date",
            "source_filename",
            "upload_status",
            "rows",
            "created_at",
            "updated_at",
        )
