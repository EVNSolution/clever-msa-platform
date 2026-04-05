from datetime import date
from unittest import TestCase

from dispatchops.services.dispatch_board_service import DispatchBoardService
from dispatchops.services.source_clients import SourceClientError, SourceServiceError


class FakeSourceClients:
    def __init__(
        self,
        *,
        plans=None,
        assignments=None,
        current_assignments=None,
        schedules=None,
        vehicles=None,
        drivers=None,
    ):
        self.plans = plans or []
        self.assignments = assignments or []
        self.current_assignments = current_assignments or []
        self.schedules = schedules or []
        self.vehicles = vehicles or []
        self.drivers = drivers or []

    def list_dispatch_plans(self, *, dispatch_date, fleet_id, authorization: str):
        return list(self.plans)

    def list_dispatch_assignments(self, *, dispatch_date, authorization: str):
        return list(self.assignments)

    def list_vehicle_schedules(self, *, dispatch_date, fleet_id, authorization: str):
        return list(self.schedules)

    def list_assigned_assignments(self, *, authorization: str):
        return list(self.current_assignments)

    def list_vehicle_masters(self, *, authorization: str):
        return list(self.vehicles)

    def list_drivers(self, *, authorization: str):
        return list(self.drivers)


class UnavailableCurrentAssignmentsSourceClients(FakeSourceClients):
    def list_assigned_assignments(self, *, authorization: str):
        raise SourceServiceError("assignment source unavailable")


class UnavailableCurrentAssignmentsClientErrorSourceClients(FakeSourceClients):
    def list_assigned_assignments(self, *, authorization: str):
        raise SourceClientError("assignment source unavailable")


class DispatchBoardServiceContractTests(TestCase):
    def setUp(self) -> None:
        self.authorization = "Bearer token"
        self.dispatch_date = date(2026, 3, 24)
        self.fleet_id = "fleet-1"

    def test_builds_board_rows_from_dispatch_assignments_and_resolves_lookup_fields(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(
            result["board"],
            [
                {
                    "dispatch_date": "2026-03-24",
                    "vehicle_schedule_id": "schedule-1",
                    "dispatch_assignment_id": "assignment-1",
                    "shift_slot": "A",
                    "vehicle_id": "vehicle-1",
                    "plate_number": "12가3456",
                    "planned_driver_id": "driver-1",
                    "planned_driver_name": "Kim Driver",
                    "current_driver_id": None,
                    "current_driver_name": None,
                    "dispatch_status": "not_started",
                    "warnings": [],
                }
            ],
        )

    def test_excludes_empty_schedule_slots_without_dispatch_assignment_rows(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"], [])

    def test_marks_row_as_matched_when_current_driver_equals_planned_driver(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                current_assignments=[
                    {
                        "driver_vehicle_assignment_id": "current-1",
                        "driver_id": "driver-1",
                        "vehicle_id": "vehicle-1",
                        "operator_company_id": "company-1",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-24T05:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"][0]["dispatch_status"], "matched")
        self.assertEqual(result["board"][0]["current_driver_id"], "driver-1")
        self.assertEqual(result["board"][0]["current_driver_name"], "Kim Driver")
        self.assertEqual(
            result["summary"],
            {
                "dispatch_date": "2026-03-24",
                "fleet_id": "fleet-1",
                "planned_volume": 17,
                "planned_assignment_count": 1,
                "matched_count": 1,
                "not_started_count": 0,
                "dispatch_unit_changed_count": 0,
                "unplanned_current_count": 0,
            },
        )

    def test_marks_row_as_not_started_when_current_truth_is_absent(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                current_assignments=[],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"][0]["dispatch_status"], "not_started")
        self.assertIsNone(result["board"][0]["current_driver_id"])
        self.assertEqual(result["summary"]["not_started_count"], 1)

    def test_marks_row_as_dispatch_unit_changed_when_current_driver_differs(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                current_assignments=[
                    {
                        "driver_vehicle_assignment_id": "current-1",
                        "driver_id": "driver-2",
                        "vehicle_id": "vehicle-1",
                        "operator_company_id": "company-1",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-24T05:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                    {"driver_id": "driver-2", "name": "Lee Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"][0]["dispatch_status"], "dispatch_unit_changed")
        self.assertEqual(result["board"][0]["current_driver_id"], "driver-2")
        self.assertEqual(result["board"][0]["current_driver_name"], "Lee Driver")
        self.assertEqual(result["summary"]["dispatch_unit_changed_count"], 1)
        self.assertEqual(result["summary"]["not_started_count"], 0)

    def test_adds_synthetic_unplanned_current_row_when_current_truth_has_no_plan(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[],
                schedules=[],
                current_assignments=[
                    {
                        "driver_vehicle_assignment_id": "current-1",
                        "driver_id": "driver-2",
                        "vehicle_id": "vehicle-9",
                        "operator_company_id": "company-1",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-24T05:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-9", "plate_number": "98다7654"},
                ],
                drivers=[
                    {"driver_id": "driver-2", "name": "Lee Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(
            result["board"],
            [
                {
                    "dispatch_date": "2026-03-24",
                    "vehicle_schedule_id": None,
                    "dispatch_assignment_id": None,
                    "shift_slot": None,
                    "vehicle_id": "vehicle-9",
                    "plate_number": "98다7654",
                    "planned_driver_id": None,
                    "planned_driver_name": None,
                    "current_driver_id": "driver-2",
                    "current_driver_name": "Lee Driver",
                    "dispatch_status": "unplanned_current",
                    "warnings": [],
                }
            ],
        )
        self.assertEqual(result["summary"]["planned_assignment_count"], 0)
        self.assertEqual(result["summary"]["unplanned_current_count"], 1)

    def test_adds_lookup_failure_warnings_without_replacing_dispatch_status(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                current_assignments=[
                    {
                        "driver_vehicle_assignment_id": "current-1",
                        "driver_id": "driver-9",
                        "vehicle_id": "vehicle-1",
                        "operator_company_id": "company-1",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-24T05:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                vehicles=[],
                drivers=[],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"][0]["dispatch_status"], "dispatch_unit_changed")
        self.assertCountEqual(
            result["board"][0]["warnings"],
            [
                "vehicle_lookup_failed",
                "planned_driver_lookup_failed",
                "current_driver_lookup_failed",
            ],
        )

    def test_marks_current_assignment_source_unavailable_as_warning_and_keeps_row_status(self):
        service = DispatchBoardService(
            source_clients=UnavailableCurrentAssignmentsSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"][0]["dispatch_status"], "not_started")
        self.assertEqual(
            result["board"][0]["warnings"],
            ["current_assignment_source_unavailable"],
        )

    def test_current_assignment_source_client_error_also_falls_back_to_warning(self):
        service = DispatchBoardService(
            source_clients=UnavailableCurrentAssignmentsClientErrorSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"][0]["dispatch_status"], "not_started")
        self.assertEqual(
            result["board"][0]["warnings"],
            ["current_assignment_source_unavailable"],
        )

    def test_aggregates_summary_counts_for_all_supported_dispatch_statuses(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 10,
                        "dispatch_status": "published",
                    },
                    {
                        "dispatch_plan_id": "plan-2",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 7,
                        "dispatch_status": "published",
                    },
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    },
                    {
                        "dispatch_assignment_id": "assignment-2",
                        "vehicle_schedule_id": "schedule-2",
                        "vehicle_id": "vehicle-2",
                        "driver_id": "driver-2",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "B",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    },
                    {
                        "dispatch_assignment_id": "assignment-3",
                        "vehicle_schedule_id": "schedule-3",
                        "vehicle_id": "vehicle-3",
                        "driver_id": "driver-3",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "C",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    },
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    },
                    {
                        "vehicle_schedule_id": "schedule-2",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-2",
                    },
                    {
                        "vehicle_schedule_id": "schedule-3",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-3",
                    },
                    {
                        "vehicle_schedule_id": "schedule-4",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-4",
                    },
                ],
                current_assignments=[
                    {
                        "driver_vehicle_assignment_id": "current-1",
                        "driver_id": "driver-1",
                        "vehicle_id": "vehicle-1",
                        "operator_company_id": "company-1",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-24T05:00:00+09:00",
                        "unassigned_at": None,
                    },
                    {
                        "driver_vehicle_assignment_id": "current-2",
                        "driver_id": "driver-9",
                        "vehicle_id": "vehicle-3",
                        "operator_company_id": "company-1",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-24T05:00:00+09:00",
                        "unassigned_at": None,
                    },
                    {
                        "driver_vehicle_assignment_id": "current-3",
                        "driver_id": "driver-4",
                        "vehicle_id": "vehicle-4",
                        "operator_company_id": "company-1",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-24T05:00:00+09:00",
                        "unassigned_at": None,
                    },
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                    {"vehicle_id": "vehicle-2", "plate_number": "23나4567"},
                    {"vehicle_id": "vehicle-3", "plate_number": "34다5678"},
                    {"vehicle_id": "vehicle-4", "plate_number": "45라6789"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                    {"driver_id": "driver-2", "name": "Lee Driver"},
                    {"driver_id": "driver-3", "name": "Park Driver"},
                    {"driver_id": "driver-4", "name": "Choi Driver"},
                    {"driver_id": "driver-9", "name": "Han Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(len(result["board"]), 4)
        self.assertEqual(
            result["summary"],
            {
                "dispatch_date": "2026-03-24",
                "fleet_id": "fleet-1",
                "planned_volume": 17,
                "planned_assignment_count": 3,
                "matched_count": 1,
                "not_started_count": 1,
                "dispatch_unit_changed_count": 1,
                "unplanned_current_count": 1,
            },
        )

    def test_uses_latest_assigned_at_for_duplicate_current_assignments_regardless_of_input_order(self):
        earlier_assignment = {
            "driver_vehicle_assignment_id": "current-1",
            "driver_id": "driver-1",
            "vehicle_id": "vehicle-1",
            "operator_company_id": "company-1",
            "assignment_status": "assigned",
            "assigned_at": "2026-03-24T05:00:00+09:00",
            "unassigned_at": None,
        }
        later_assignment = {
            "driver_vehicle_assignment_id": "current-2",
            "driver_id": "driver-2",
            "vehicle_id": "vehicle-1",
            "operator_company_id": "company-1",
            "assignment_status": "assigned",
            "assigned_at": "2026-03-24T05:05:00+09:00",
            "unassigned_at": None,
        }
        first_result = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                current_assignments=[earlier_assignment, later_assignment],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                    {"driver_id": "driver-2", "name": "Lee Driver"},
                ],
            )
        ).build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )
        second_result = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                current_assignments=[later_assignment, earlier_assignment],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                    {"driver_id": "driver-2", "name": "Lee Driver"},
                ],
            )
        ).build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(first_result["board"][0]["current_driver_id"], "driver-2")
        self.assertEqual(first_result["board"][0]["dispatch_status"], "dispatch_unit_changed")
        self.assertEqual(second_result["board"][0]["current_driver_id"], "driver-2")
        self.assertEqual(second_result["board"][0]["dispatch_status"], "dispatch_unit_changed")

    def test_uses_true_chronological_order_for_duplicate_current_assignments_with_mixed_offsets(self):
        lexically_later_but_earlier_time = {
            "driver_vehicle_assignment_id": "current-1",
            "driver_id": "driver-1",
            "vehicle_id": "vehicle-1",
            "operator_company_id": "company-1",
            "assignment_status": "assigned",
            "assigned_at": "2026-03-24T09:30:00+09:00",
            "unassigned_at": None,
        }
        lexically_earlier_but_later_time = {
            "driver_vehicle_assignment_id": "current-2",
            "driver_id": "driver-2",
            "vehicle_id": "vehicle-1",
            "operator_company_id": "company-1",
            "assignment_status": "assigned",
            "assigned_at": "2026-03-24T01:00:00+00:00",
            "unassigned_at": None,
        }

        result = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 17,
                        "dispatch_status": "published",
                    }
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    }
                ],
                current_assignments=[
                    lexically_later_but_earlier_time,
                    lexically_earlier_but_later_time,
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                    {"driver_id": "driver-2", "name": "Lee Driver"},
                ],
            )
        ).build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(result["board"][0]["current_driver_id"], "driver-2")
        self.assertEqual(result["board"][0]["dispatch_status"], "dispatch_unit_changed")

    def test_counts_only_normalized_valid_planned_assignments_and_ignores_malformed_plan_rows(self):
        service = DispatchBoardService(
            source_clients=FakeSourceClients(
                plans=[
                    {
                        "dispatch_plan_id": "plan-1",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": 10,
                        "dispatch_status": "published",
                    },
                    "malformed-plan",
                    {
                        "dispatch_plan_id": "plan-2",
                        "company_id": "company-1",
                        "fleet_id": self.fleet_id,
                        "dispatch_date": "2026-03-24",
                        "planned_volume": None,
                        "dispatch_status": "published",
                    },
                ],
                assignments=[
                    {
                        "dispatch_assignment_id": "assignment-1",
                        "vehicle_schedule_id": "schedule-1",
                        "vehicle_id": "vehicle-1",
                        "driver_id": "driver-1",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    },
                    "malformed-assignment",
                    {
                        "dispatch_assignment_id": "assignment-2",
                        "vehicle_schedule_id": "schedule-2",
                        "vehicle_id": None,
                        "driver_id": "driver-2",
                        "operator_company_id": "company-1",
                        "dispatch_date": "2026-03-24",
                        "shift_slot": "B",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-23T09:00:00+09:00",
                        "unassigned_at": None,
                    },
                ],
                schedules=[
                    {
                        "vehicle_schedule_id": "schedule-1",
                        "dispatch_date": "2026-03-24",
                        "fleet_id": self.fleet_id,
                        "vehicle_id": "vehicle-1",
                    }
                ],
                vehicles=[
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                ],
                drivers=[
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                    {"driver_id": "driver-2", "name": "Lee Driver"},
                ],
            )
        )

        result = service.build_board(
            dispatch_date=self.dispatch_date,
            fleet_id=self.fleet_id,
            authorization=self.authorization,
        )

        self.assertEqual(len(result["board"]), 1)
        self.assertEqual(result["summary"]["planned_assignment_count"], 1)
        self.assertEqual(result["summary"]["planned_volume"], 10)
