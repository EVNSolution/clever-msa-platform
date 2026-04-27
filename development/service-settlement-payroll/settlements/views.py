"""Read/write endpoints for settlement payroll runs and items."""
from collections import Counter
from decimal import Decimal
from datetime import date

try:
    from drf_spectacular.utils import extend_schema
except ModuleNotFoundError:
    def extend_schema(*args, **kwargs):
        def decorator(target):
            return target

        return decorator

from uuid import UUID

from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from settlements.exceptions import UpstreamServiceUnavailable
from settlements.models import SettlementItem, SettlementRun
from settlements.permissions import AuthenticatedReadAdminWrite
from settlements.serializers import (
    DriverDailySettlementQuerySerializer,
    DriverDailySettlementSerializer,
    HealthSerializer,
    SettlementItemSerializer,
    SettlementRunSerializer,
)
from settlements.services.daily_settlement_source_service import DailySettlementSourceService
from settlements.services.source_clients import SourceClients, SourceNotFoundError, SourceServiceError


def _parse_uuid_filter(value: str, *, field_name: str):
    try:
        return UUID(value)
    except ValueError as exc:
        raise ValidationError({field_name: ["Must be a valid UUID."]}) from exc


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: HealthSerializer})
    def get(self, request):
        return Response({"status": "ok"})


class DriverDailySettlementView(APIView):
    permission_classes = [AuthenticatedReadAdminWrite]
    http_method_names = ["get", "head", "options"]

    @extend_schema(exclude=True)
    def get(self, request, driver_id):
        query_serializer = DriverDailySettlementQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        try:
            payload = DailySettlementSourceService(
                source_clients=SourceClients(),
            ).build_driver_daily_settlements(
                driver_id=str(driver_id),
                date_from=query_serializer.validated_data["date_from"],
                date_to=query_serializer.validated_data["date_to"],
                authorization=request.headers.get("Authorization", ""),
            )
        except (SourceNotFoundError, SourceServiceError) as exc:
            raise UpstreamServiceUnavailable() from exc

        return Response(DriverDailySettlementSerializer(payload).data, status=status.HTTP_200_OK)


class SettlementRunViewSet(viewsets.ModelViewSet):
    queryset = SettlementRun.objects.all()
    serializer_class = SettlementRunSerializer
    lookup_field = "settlement_run_id"
    permission_classes = [AuthenticatedReadAdminWrite]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset

        company_id = self.request.query_params.get("company_id")
        fleet_id = self.request.query_params.get("fleet_id")

        if company_id:
            queryset = queryset.filter(company_id=_parse_uuid_filter(company_id, field_name="company_id"))
        if fleet_id:
            queryset = queryset.filter(fleet_id=_parse_uuid_filter(fleet_id, field_name="fleet_id"))

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        authorization = request.headers.get("Authorization", "")

        with transaction.atomic():
            run = serializer.save()
            try:
                self._generate_items(run=run, authorization=authorization)
            except SourceNotFoundError as exc:
                raise ValidationError({"detail": [str(exc)]}) from exc
            except SourceServiceError as exc:
                raise ValidationError({"detail": [str(exc)]}) from exc

        response_serializer = self.get_serializer(run)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _generate_items(self, *, run: SettlementRun, authorization: str) -> None:
        aggregated_amounts = DailySettlementSourceService(
            source_clients=SourceClients(),
        ).build_run_driver_amounts(
            company_id=str(run.company_id),
            fleet_id=str(run.fleet_id),
            period_start=run.period_start,
            period_end=run.period_end,
            authorization=authorization,
        )

        for driver_id, amount in aggregated_amounts.items():
            SettlementItem.objects.create(
                settlement_run=run,
                driver_id=driver_id,
                amount=amount.quantize(Decimal("0.01")),
                payout_status="pending",
            )


class SettlementItemViewSet(viewsets.ModelViewSet):
    queryset = SettlementItem.objects.all()
    serializer_class = SettlementItemSerializer
    lookup_field = "settlement_item_id"
    permission_classes = [AuthenticatedReadAdminWrite]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset

        company_id = self.request.query_params.get("company_id")
        fleet_id = self.request.query_params.get("fleet_id")

        if company_id:
            queryset = queryset.filter(settlement_run__company_id=_parse_uuid_filter(company_id, field_name="company_id"))
        if fleet_id:
            queryset = queryset.filter(settlement_run__fleet_id=_parse_uuid_filter(fleet_id, field_name="fleet_id"))

        return queryset
