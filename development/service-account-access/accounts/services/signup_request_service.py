from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import (
    CompanyManagerRole,
    DriverAccount,
    IdentityAccountLink,
    IdentitySignupRequest,
    ManagerAccount,
)
from accounts.services.company_manager_role_service import CompanyManagerRoleService
from accounts.services.manager_account_scope_service import ManagerAccountScopeService
from accounts.services.product_account_lifecycle_service import ProductAccountLifecycleService


class SignupRequestService:
    def is_auto_approved_driver_signup(self, *, company_id, request_type: str) -> bool:
        return (
            request_type == IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE
            and str(company_id) in set(settings.AUTO_APPROVED_DRIVER_SIGNUP_COMPANY_IDS)
        )

    def validate_creatable_request(
        self,
        identity,
        *,
        company_id,
        request_type: str,
        is_re_request: bool,
    ) -> None:
        active_manager = ManagerAccount.objects.filter(
            identity=identity,
            status=ManagerAccount.Status.ACTIVE,
        ).first()
        active_driver = DriverAccount.objects.filter(
            identity=identity,
            status=DriverAccount.Status.ACTIVE,
        ).first()
        if (
            is_re_request
            and request_type == IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE
            and active_manager is not None
            and active_driver is not None
        ):
            raise ValidationError(
                {
                    "request_type": [
                        "Combined company change for manager and driver accounts must use manager_account_create."
                    ]
                }
            )

        if IdentitySignupRequest.objects.filter(
            identity=identity,
            company_id=company_id,
            request_type=request_type,
            status=IdentitySignupRequest.Status.PENDING,
        ).exists():
            raise ValidationError({"request_type": ["Pending request already exists for this scope."]})

        active_account = self._get_active_account(identity, request_type=request_type)
        if active_account is None:
            if is_re_request:
                raise ValidationError({"is_re_request": ["Re-request requires an active account."]})
            return

        if str(active_account.company_id) == str(company_id):
            raise ValidationError({"request_type": ["Active account already exists for this company."]})
        if not is_re_request:
            raise ValidationError({"is_re_request": ["Company change must be created as a re-request."]})

    def create_request(
        self,
        identity,
        *,
        company_id,
        request_type: str,
        is_re_request: bool,
    ) -> IdentitySignupRequest:
        active_account = self._get_active_account(identity, request_type=request_type)
        with transaction.atomic():
            request = IdentitySignupRequest.objects.create(
                identity=identity,
                company_id=company_id,
                request_type=request_type,
                is_re_request=is_re_request,
                from_company_id=getattr(active_account, "company_id", None) if is_re_request else None,
            )
            if self.is_auto_approved_driver_signup(company_id=company_id, request_type=request_type):
                return self._auto_approve_driver_request(request)
            return request

    def list_manageable_requests(self, principal, *, status_value: str | None = None):
        queryset = IdentitySignupRequest.objects.select_related("identity").order_by("-requested_at")
        if getattr(principal, "system_admin_account", None) is not None:
            pass
        elif getattr(principal, "manager_account", None) is not None:
            queryset = queryset.filter(company_id=principal.manager_account.company_id)
            if principal.manager_account.role_type in {
                ManagerAccount.RoleType.VEHICLE_MANAGER,
                ManagerAccount.RoleType.SETTLEMENT_MANAGER,
                ManagerAccount.RoleType.FLEET_MANAGER,
            }:
                queryset = queryset.filter(
                    request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE
                )
            queryset = queryset.filter(identity__status="active")
        else:
            raise PermissionDenied("Request management is not allowed for this account.")

        if status_value == IdentitySignupRequest.Status.PENDING:
            queryset = queryset.filter(
                status__in=[
                    IdentitySignupRequest.Status.PENDING,
                    IdentitySignupRequest.Status.AWAITING_SETUP,
                ]
            )
        elif status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    def get_manageable_request(self, principal, request_id):
        request = get_object_or_404(
            IdentitySignupRequest.objects.select_related("identity"),
            identity_signup_request_id=request_id,
        )
        manageable_ids = self.list_manageable_requests(principal).values_list(
            "identity_signup_request_id", flat=True
        )
        if request.identity_signup_request_id not in manageable_ids:
            raise PermissionDenied("Request management is not allowed for this account.")
        return request

    def cancel_request(self, principal, request: IdentitySignupRequest) -> IdentitySignupRequest:
        if request.identity_id != principal.identity.identity_id:
            raise PermissionDenied("You can cancel only your own request.")
        if request.status not in {
            IdentitySignupRequest.Status.PENDING,
            IdentitySignupRequest.Status.AWAITING_SETUP,
        }:
            raise ValidationError({"status": ["Only active requests can be cancelled."]})
        request.status = IdentitySignupRequest.Status.REJECTED
        request.reject_reason = "user_cancelled"
        request.save(update_fields=["status", "reject_reason"])
        return request

    def approve_request(
        self,
        principal,
        request: IdentitySignupRequest,
        *,
        role_type: str | None = None,
        fleet_ids: list | None = None,
        authorization: str = "",
    ) -> IdentitySignupRequest:
        if request.request_type == IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE:
            if request.status not in {
                IdentitySignupRequest.Status.PENDING,
                IdentitySignupRequest.Status.AWAITING_SETUP,
            }:
                raise ValidationError({"status": ["Only active manager requests can be approved."]})
            if role_type is None:
                if request.status != IdentitySignupRequest.Status.PENDING:
                    raise ValidationError({"role_type": ["Role type is required for manager approval."]})

                with transaction.atomic():
                    self._prepare_manager_rerequest_transition(request)
                    request.status = IdentitySignupRequest.Status.AWAITING_SETUP
                    self._stamp_reviewer(principal, request)
                    request.save(
                        update_fields=[
                            "status",
                            "reviewed_by_system_admin_account",
                            "reviewed_by_manager_account",
                        ]
                    )
                    return request

            role = self._validate_manager_role_type(principal, request.company_id, role_type)
            validated_fleet_ids = ManagerAccountScopeService().validate_role_assignment_scope(
                company_id=request.company_id,
                role=role,
                fleet_ids=fleet_ids,
                authorization=authorization,
            )

            with transaction.atomic():
                if request.status == IdentitySignupRequest.Status.PENDING:
                    self._prepare_manager_rerequest_transition(request)
                self._create_manager_account(
                    identity=request.identity,
                    company_id=request.company_id,
                    role_type=role_type,
                    fleet_ids=validated_fleet_ids,
                )
                request.status = IdentitySignupRequest.Status.APPROVED
                self._stamp_reviewer(principal, request)
                request.save(
                    update_fields=[
                        "status",
                        "reviewed_by_system_admin_account",
                        "reviewed_by_manager_account",
                    ]
                )
                return request

        lifecycle = ProductAccountLifecycleService()
        if request.status != IdentitySignupRequest.Status.PENDING:
            raise ValidationError({"status": ["Only pending requests can be approved."]})

        with transaction.atomic():
            if request.is_re_request:
                active_driver = DriverAccount.objects.filter(
                    identity=request.identity,
                    status=DriverAccount.Status.ACTIVE,
                ).first()
                if active_driver is not None:
                    lifecycle.archive_driver_account(active_driver, unlink_reason="company_changed")

            driver_account = DriverAccount.objects.create(
                identity=request.identity,
                company_id=request.company_id,
                status=DriverAccount.Status.ACTIVE,
            )
            IdentityAccountLink.objects.create(
                identity=request.identity,
                account_type=IdentityAccountLink.AccountType.DRIVER,
                account_id=driver_account.driver_account_id,
            )
            request.status = IdentitySignupRequest.Status.APPROVED
            self._stamp_reviewer(principal, request)
            request.save(
                update_fields=[
                    "status",
                    "reviewed_by_system_admin_account",
                    "reviewed_by_manager_account",
                ]
            )
            return request

    def _validate_manager_role_type(self, principal, company_id, role_type: str) -> CompanyManagerRole:
        CompanyManagerRoleService().ensure_default_roles(company_id)
        role = CompanyManagerRole.objects.filter(
            company_id=company_id,
            code=role_type,
            is_active=True,
        ).first()
        if role is None:
            raise ValidationError({"role_type": ["Manager role does not exist for this company."]})

        if getattr(principal, "system_admin_account", None) is None:
            manager_account = getattr(principal, "manager_account", None)
            if manager_account is None or manager_account.role_type != ManagerAccount.RoleType.COMPANY_SUPER_ADMIN:
                raise PermissionDenied("Manager setup is not allowed for this account.")
            if manager_account.company_id != company_id:
                raise PermissionDenied("Company super admin can configure only roles in the same company.")
            if role.code == ManagerAccount.RoleType.COMPANY_SUPER_ADMIN:
                raise PermissionDenied("Company super admin cannot configure company super admin role.")
        return role

    def reject_request(
        self,
        principal,
        request: IdentitySignupRequest,
        *,
        reject_reason: str,
    ) -> IdentitySignupRequest:
        if request.status not in {
            IdentitySignupRequest.Status.PENDING,
            IdentitySignupRequest.Status.AWAITING_SETUP,
        }:
            raise ValidationError({"status": ["Only active requests can be rejected."]})
        request.status = IdentitySignupRequest.Status.REJECTED
        request.reject_reason = reject_reason
        self._stamp_reviewer(principal, request)
        request.save(
            update_fields=[
                "status",
                "reject_reason",
                "reviewed_by_system_admin_account",
                "reviewed_by_manager_account",
            ]
        )
        return request

    def complete_manager_setup(
        self,
        principal,
        request: IdentitySignupRequest,
        *,
        role_type: str,
        fleet_ids: list | None = None,
        authorization: str = "",
    ) -> IdentitySignupRequest:
        if request.request_type != IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE:
            raise ValidationError({"request_type": ["Only manager requests can complete setup."]})
        if request.status != IdentitySignupRequest.Status.AWAITING_SETUP:
            raise ValidationError({"status": ["Request is not awaiting setup."]})

        role = self._validate_manager_role_type(principal, request.company_id, role_type)
        validated_fleet_ids = ManagerAccountScopeService().validate_role_assignment_scope(
            company_id=request.company_id,
            role=role,
            fleet_ids=fleet_ids,
            authorization=authorization,
        )

        with transaction.atomic():
            self._create_manager_account(
                identity=request.identity,
                company_id=request.company_id,
                role_type=role_type,
                fleet_ids=validated_fleet_ids,
            )
            request.status = IdentitySignupRequest.Status.APPROVED
            self._stamp_reviewer(principal, request)
            request.save(
                update_fields=[
                    "status",
                    "reviewed_by_system_admin_account",
                    "reviewed_by_manager_account",
                ]
            )
            return request

    def _stamp_reviewer(self, principal, request: IdentitySignupRequest) -> None:
        request.reviewed_by_system_admin_account = getattr(principal, "system_admin_account", None)
        request.reviewed_by_manager_account = getattr(principal, "manager_account", None)

    def _prepare_manager_rerequest_transition(self, request: IdentitySignupRequest) -> None:
        if not request.is_re_request:
            return

        lifecycle = ProductAccountLifecycleService()
        active_manager = ManagerAccount.objects.filter(
            identity=request.identity,
            status=ManagerAccount.Status.ACTIVE,
        ).first()
        if active_manager is not None:
            lifecycle.archive_manager_account(active_manager, unlink_reason="company_changed")

        active_driver = DriverAccount.objects.filter(
            identity=request.identity,
            status=DriverAccount.Status.ACTIVE,
        ).first()
        if active_driver is not None:
            lifecycle.archive_driver_account(active_driver, unlink_reason="company_changed")
            new_driver_account = DriverAccount.objects.create(
                identity=request.identity,
                company_id=request.company_id,
                status=DriverAccount.Status.ACTIVE,
            )
            IdentityAccountLink.objects.create(
                identity=request.identity,
                account_type=IdentityAccountLink.AccountType.DRIVER,
                account_id=new_driver_account.driver_account_id,
            )

    def _create_manager_account(
        self,
        *,
        identity,
        company_id,
        role_type: str,
        fleet_ids: list,
    ) -> ManagerAccount:
        manager_account = ManagerAccount.objects.create(
            identity=identity,
            company_id=company_id,
            role_type=role_type,
            status=ManagerAccount.Status.ACTIVE,
        )
        IdentityAccountLink.objects.create(
            identity=identity,
            account_type=IdentityAccountLink.AccountType.MANAGER,
            account_id=manager_account.manager_account_id,
        )
        ManagerAccountScopeService().sync_assignments(
            manager_account=manager_account,
            fleet_ids=fleet_ids,
        )
        return manager_account

    def _auto_approve_driver_request(self, request: IdentitySignupRequest) -> IdentitySignupRequest:
        lifecycle = ProductAccountLifecycleService()
        if request.status != IdentitySignupRequest.Status.PENDING:
            return request

        if request.is_re_request:
            active_driver = DriverAccount.objects.filter(
                identity=request.identity,
                status=DriverAccount.Status.ACTIVE,
            ).first()
            if active_driver is not None:
                lifecycle.archive_driver_account(active_driver, unlink_reason="company_changed")

        driver_account = DriverAccount.objects.create(
            identity=request.identity,
            company_id=request.company_id,
            status=DriverAccount.Status.ACTIVE,
        )
        IdentityAccountLink.objects.create(
            identity=request.identity,
            account_type=IdentityAccountLink.AccountType.DRIVER,
            account_id=driver_account.driver_account_id,
        )
        request.status = IdentitySignupRequest.Status.APPROVED
        request.save(update_fields=["status"])
        return request

    def _get_active_account(self, identity, *, request_type: str):
        if request_type == IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE:
            return ManagerAccount.objects.filter(
                identity=identity,
                status=ManagerAccount.Status.ACTIVE,
            ).first()
        return DriverAccount.objects.filter(
            identity=identity,
            status=DriverAccount.Status.ACTIVE,
        ).first()
