from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from dispatchops.permissions import AuthenticatedReadOnly
from dispatchops.serializers import (
    DispatchOpsBoardRowSerializer,
    DispatchOpsQuerySerializer,
    DispatchOpsSummarySerializer,
)
from dispatchops.services.dispatch_board_service import DispatchBoardService


def _order_board_rows(rows):
    def sort_key(row):
        shift_slot = row.get("shift_slot")
        if shift_slot is None:
            return (1, str(row.get("plate_number") or ""), str(row.get("vehicle_id") or ""))
        normalized_shift_slot = str(shift_slot).strip()
        if normalized_shift_slot.isdigit():
            return (
                0,
                0,
                int(normalized_shift_slot),
                str(row.get("plate_number") or ""),
                str(row.get("vehicle_id") or ""),
            )
        return (
            0,
            1,
            normalized_shift_slot.casefold(),
            str(row.get("plate_number") or ""),
            str(row.get("vehicle_id") or ""),
        )

    return sorted(rows, key=sort_key)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class BoardView(APIView):
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request):
        query_serializer = DispatchOpsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        result = DispatchBoardService().build_board(
            dispatch_date=query_serializer.validated_data["dispatch_date"],
            fleet_id=query_serializer.validated_data["fleet_id"],
            authorization=request.META.get("HTTP_AUTHORIZATION", ""),
        )
        board = _order_board_rows(result["board"])
        response_serializer = DispatchOpsBoardRowSerializer(board, many=True)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class SummaryView(APIView):
    permission_classes = [AuthenticatedReadOnly]

    def get(self, request):
        query_serializer = DispatchOpsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        result = DispatchBoardService().build_board(
            dispatch_date=query_serializer.validated_data["dispatch_date"],
            fleet_id=query_serializer.validated_data["fleet_id"],
            authorization=request.META.get("HTTP_AUTHORIZATION", ""),
        )
        response_serializer = DispatchOpsSummarySerializer(result["summary"])
        return Response(response_serializer.data, status=status.HTTP_200_OK)
