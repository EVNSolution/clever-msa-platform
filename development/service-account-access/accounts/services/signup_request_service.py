from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import (
    DriverAccount,
    IdentityAccountLink,
    IdentitySignupRequest,
    ManagerAccount,
)


class SignupRequestService:
    def list_manageable_requests(self, principal, *, status_value: str | None = None):
        queryset = IdentitySignupRequest.objects.select_related("identity").order_by("-requested_at")
        if getattr(principal, "system_admin_account", None) is not None:
            pass
        elif getattr(principal, "manager_account", None) is not None:
            queryset = queryset.filter(company_id=principal.manager_account.company_id)
            if principal.manager_account.role_type in {
                ManagerAccount.RoleType.VEHICLE_MANAGER,
                ManagerAccount.RoleType.SETTLEMENT_MANAGER,
            }:
                queryset = queryset.filter(
                    request_type=IdentitySignupRequest.RequestType.DRIVER_ACCOUNT_CREATE
                )
            queryset = queryset.filter(identity__status="active")
        else:
            raise PermissionDenied("Request management is not allowed for this account.")

        if status_value:
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

    def approve_request(self, principal, request: IdentitySignupRequest) -> IdentitySignupRequest:
        if request.status != IdentitySignupRequest.Status.PENDING:
            raise ValidationError({"status": ["Only pending requests can be approved."]})

        if request.request_type == IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE:
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

        with transaction.atomic():
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
    ) -> IdentitySignupRequest:
        if request.request_type != IdentitySignupRequest.RequestType.MANAGER_ACCOUNT_CREATE:
            raise ValidationError({"request_type": ["Only manager requests can complete setup."]})
        if request.status != IdentitySignupRequest.Status.AWAITING_SETUP:
            raise ValidationError({"status": ["Request is not awaiting setup."]})

        if getattr(principal, "system_admin_account", None) is None:
            manager_account = getattr(principal, "manager_account", None)
            if manager_account is None or manager_account.role_type != ManagerAccount.RoleType.COMPANY_SUPER_ADMIN:
                raise PermissionDenied("Manager setup is not allowed for this account.")
            if role_type not in {
                ManagerAccount.RoleType.VEHICLE_MANAGER,
                ManagerAccount.RoleType.SETTLEMENT_MANAGER,
            }:
                raise PermissionDenied("Company super admin can configure only lower manager roles.")

        with transaction.atomic():
            manager_account = ManagerAccount.objects.create(
                identity=request.identity,
                company_id=request.company_id,
                role_type=role_type,
                status=ManagerAccount.Status.ACTIVE,
            )
            IdentityAccountLink.objects.create(
                identity=request.identity,
                account_type=IdentityAccountLink.AccountType.MANAGER,
                account_id=manager_account.manager_account_id,
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
