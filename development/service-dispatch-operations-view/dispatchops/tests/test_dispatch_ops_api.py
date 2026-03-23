from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient


class DispatchOpsApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.token = self._issue_token()
        self.dispatch_date = "2026-03-24"
        self.fleet_id = "11111111-1111-1111-1111-111111111111"

    def _issue_token(self) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "email": "user@example.com",
            "role": "user",
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "jti": str(uuid4()),
            "type": "access",
            "sub": str(uuid4()),
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def test_health_endpoint_allows_anonymous_access(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_board_endpoint_returns_401_when_unauthenticated(self):
        response = self.client.get("/board/", {"dispatch_date": self.dispatch_date, "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 401)

    def test_board_endpoint_returns_401_for_malformed_authorization_header(self):
        self.client.credentials(HTTP_AUTHORIZATION="Basic invalid")

        response = self.client.get("/board/", {"dispatch_date": self.dispatch_date, "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 401)

    def test_summary_endpoint_returns_401_when_unauthenticated(self):
        response = self.client.get("/summary/", {"dispatch_date": self.dispatch_date, "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 401)

    def test_summary_endpoint_returns_401_for_malformed_authorization_header(self):
        self.client.credentials(HTTP_AUTHORIZATION="Basic invalid")

        response = self.client.get("/summary/", {"dispatch_date": self.dispatch_date, "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 401)

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_board_endpoint_reorders_numeric_shift_slots_numerically(self, mock_build_board):
        mock_build_board.return_value = {
            "board": [
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": "10",
                    "vehicle_id": "vehicle-10",
                    "plate_number": "30다0001",
                    "planned_driver_id": "driver-10",
                    "planned_driver_name": "Driver Ten",
                    "current_driver_id": None,
                    "current_driver_name": None,
                    "dispatch_status": "not_started",
                    "warnings": [],
                },
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": "2",
                    "vehicle_id": "vehicle-2",
                    "plate_number": "20나0001",
                    "planned_driver_id": "driver-2",
                    "planned_driver_name": "Driver Two",
                    "current_driver_id": None,
                    "current_driver_name": None,
                    "dispatch_status": "not_started",
                    "warnings": [],
                },
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": "1",
                    "vehicle_id": "vehicle-1",
                    "plate_number": "10가0001",
                    "planned_driver_id": "driver-1",
                    "planned_driver_name": "Driver One",
                    "current_driver_id": None,
                    "current_driver_name": None,
                    "dispatch_status": "not_started",
                    "warnings": [],
                },
            ],
            "summary": {
                "dispatch_date": self.dispatch_date,
                "fleet_id": self.fleet_id,
                "planned_volume": 3,
                "planned_assignment_count": 3,
                "matched_count": 0,
                "not_started_count": 3,
                "dispatch_unit_changed_count": 0,
                "unplanned_current_count": 0,
            },
        }
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/board/", {"dispatch_date": self.dispatch_date, "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["shift_slot"] for row in response.data], ["1", "2", "10"])

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_board_endpoint_returns_sorted_rows(self, mock_build_board):
        mock_build_board.return_value = {
            "board": [
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": None,
                    "vehicle_id": "vehicle-9",
                    "plate_number": "98다7654",
                    "planned_driver_id": None,
                    "planned_driver_name": None,
                    "current_driver_id": "driver-9",
                    "current_driver_name": "Driver Nine",
                    "dispatch_status": "unplanned_current",
                    "warnings": [],
                },
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": "B",
                    "vehicle_id": "vehicle-2",
                    "plate_number": "23나4567",
                    "planned_driver_id": "driver-2",
                    "planned_driver_name": "Driver Two",
                    "current_driver_id": None,
                    "current_driver_name": None,
                    "dispatch_status": "not_started",
                    "warnings": [],
                },
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": "A",
                    "vehicle_id": "vehicle-1",
                    "plate_number": "12가3456",
                    "planned_driver_id": "driver-1",
                    "planned_driver_name": "Driver One",
                    "current_driver_id": "driver-1",
                    "current_driver_name": "Driver One",
                    "dispatch_status": "matched",
                    "warnings": [],
                },
            ],
            "summary": {
                "dispatch_date": self.dispatch_date,
                "fleet_id": self.fleet_id,
                "planned_volume": 3,
                "planned_assignment_count": 3,
                "matched_count": 1,
                "not_started_count": 1,
                "dispatch_unit_changed_count": 0,
                "unplanned_current_count": 1,
            },
        }
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/board/", {"dispatch_date": self.dispatch_date, "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            [
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": "A",
                    "vehicle_id": "vehicle-1",
                    "plate_number": "12가3456",
                    "planned_driver_id": "driver-1",
                    "planned_driver_name": "Driver One",
                    "current_driver_id": "driver-1",
                    "current_driver_name": "Driver One",
                    "dispatch_status": "matched",
                    "warnings": [],
                },
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": "B",
                    "vehicle_id": "vehicle-2",
                    "plate_number": "23나4567",
                    "planned_driver_id": "driver-2",
                    "planned_driver_name": "Driver Two",
                    "current_driver_id": None,
                    "current_driver_name": None,
                    "dispatch_status": "not_started",
                    "warnings": [],
                },
                {
                    "dispatch_date": self.dispatch_date,
                    "shift_slot": None,
                    "vehicle_id": "vehicle-9",
                    "plate_number": "98다7654",
                    "planned_driver_id": None,
                    "planned_driver_name": None,
                    "current_driver_id": "driver-9",
                    "current_driver_name": "Driver Nine",
                    "dispatch_status": "unplanned_current",
                    "warnings": [],
                },
            ],
        )
        mock_build_board.assert_called_once_with(
            dispatch_date=date(2026, 3, 24),
            fleet_id=UUID(self.fleet_id),
            authorization=f"Bearer {self.token}",
        )

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_board_endpoint_returns_400_for_invalid_dispatch_date(self, mock_build_board):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/board/", {"dispatch_date": "not-a-date", "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 400)
        mock_build_board.assert_not_called()

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_board_endpoint_returns_400_for_invalid_fleet_id(self, mock_build_board):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/board/", {"dispatch_date": self.dispatch_date, "fleet_id": "not-a-uuid"})

        self.assertEqual(response.status_code, 400)
        mock_build_board.assert_not_called()

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_summary_endpoint_returns_expected_counters(self, mock_build_board):
        mock_build_board.return_value = {
            "board": [],
            "summary": {
                "dispatch_date": self.dispatch_date,
                "fleet_id": self.fleet_id,
                "planned_volume": 10,
                "planned_assignment_count": 4,
                "matched_count": 2,
                "not_started_count": 1,
                "dispatch_unit_changed_count": 1,
                "unplanned_current_count": 0,
            },
        }
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/summary/", {"dispatch_date": self.dispatch_date, "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "dispatch_date": self.dispatch_date,
                "fleet_id": self.fleet_id,
                "planned_volume": 10,
                "planned_assignment_count": 4,
                "matched_count": 2,
                "not_started_count": 1,
                "dispatch_unit_changed_count": 1,
                "unplanned_current_count": 0,
            },
        )
        mock_build_board.assert_called_once_with(
            dispatch_date=date(2026, 3, 24),
            fleet_id=UUID(self.fleet_id),
            authorization=f"Bearer {self.token}",
        )

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_summary_endpoint_returns_400_for_invalid_dispatch_date(self, mock_build_board):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/summary/", {"dispatch_date": "not-a-date", "fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 400)
        mock_build_board.assert_not_called()

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_summary_endpoint_returns_400_for_invalid_fleet_id(self, mock_build_board):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/summary/", {"dispatch_date": self.dispatch_date, "fleet_id": "not-a-uuid"})

        self.assertEqual(response.status_code, 400)
        mock_build_board.assert_not_called()

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_board_endpoint_returns_400_when_dispatch_date_is_missing(self, mock_build_board):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/board/", {"fleet_id": self.fleet_id})

        self.assertEqual(response.status_code, 400)
        mock_build_board.assert_not_called()

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_board_endpoint_returns_400_when_fleet_id_is_missing(self, mock_build_board):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/board/", {"dispatch_date": self.dispatch_date})

        self.assertEqual(response.status_code, 400)
        mock_build_board.assert_not_called()

    @patch("dispatchops.views.DispatchBoardService.build_board")
    def test_summary_endpoint_returns_400_when_filters_are_missing(self, mock_build_board):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        response = self.client.get("/summary/", {})

        self.assertEqual(response.status_code, 400)
        mock_build_board.assert_not_called()
