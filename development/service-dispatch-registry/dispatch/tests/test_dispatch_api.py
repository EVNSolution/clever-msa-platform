from datetime import date, datetime, timedelta, timezone
from importlib import import_module
from pathlib import Path
from unittest.mock import patch
from uuid import UUID, uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient


def _load_models_module(test_case: TestCase):
    try:
        return import_module("dispatch.models")
    except ModuleNotFoundError as exc:
        test_case.fail(f"dispatch.models module missing: {exc}")


class DispatchApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin")
        self.user_token = self._issue_token("user")

    def _issue_token(self, role: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(uuid4()),
            "email": f"{role}@example.com",
            "role": role,
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "jti": str(uuid4()),
            "type": "access",
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _plan_payload(self):
        return {
            "company_id": "30000000-0000-0000-0000-000000000001",
            "fleet_id": "40000000-0000-0000-0000-000000000001",
            "dispatch_date": "2026-03-24",
            "planned_volume": 120,
            "dispatch_status": "draft",
        }

    def _schedule_payload(self):
        return {
            "vehicle_id": "50000000-0000-0000-0000-000000000001",
            "fleet_id": "40000000-0000-0000-0000-000000000001",
            "dispatch_date": "2026-03-24",
            "shift_slot": "A",
            "schedule_status": "planned",
            "starts_at": "09:00:00",
            "ends_at": "18:00:00",
        }

    def _assignment_payload(self, vehicle_schedule_id: str):
        return {
            "vehicle_schedule_id": vehicle_schedule_id,
            "vehicle_id": "50000000-0000-0000-0000-000000000001",
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "outsourced_driver_id": None,
            "operator_company_id": "30000000-0000-0000-0000-000000000001",
            "dispatch_date": "2026-03-24",
            "shift_slot": "A",
            "assignment_status": "assigned",
            "assigned_at": "2026-03-24T09:00:00Z",
            "unassigned_at": None,
        }

    def _outsourced_driver_payload(self, dispatch_plan_id: str):
        return {
            "dispatch_plan_id": dispatch_plan_id,
            "name": "외부 기사",
            "contact_number": "010-9999-8888",
            "vehicle_note": "1톤 카고",
            "memo": "월말 정산 대상",
        }

    def _work_rule_payload(self, company_id: str):
        return {
            "company_id": company_id,
            "name": "주말 특근",
            "system_kind": "overtime",
        }

    def _driver_day_exception_payload(self, *, company_id: str, fleet_id: str, work_rule_id: str):
        return {
            "company_id": company_id,
            "fleet_id": fleet_id,
            "dispatch_date": "2026-03-24",
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "work_rule_id": work_rule_id,
            "memo": "긴급 물량 대응",
        }

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok"})

    def test_initial_migration_file_exists(self):
        migration_path = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_path.exists())

    def test_unauthenticated_plan_list_returns_401(self):
        response = self.client.get("/plans/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(response.data.keys()), {"code", "message", "details"})

    def test_admin_can_create_dispatch_plan(self):
        self._authenticate(self.admin_token)

        response = self.client.post("/plans/", self._plan_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("dispatch_plan_id", response.data)

    def test_admin_can_create_vehicle_schedule(self):
        self._authenticate(self.admin_token)

        response = self.client.post(
            "/vehicle-schedules/",
            self._schedule_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("vehicle_schedule_id", response.data)

    def test_admin_can_create_dispatch_assignment(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        payload = self._assignment_payload(str(schedule.vehicle_schedule_id))

        with patch(
            "dispatch.services.source_clients.SourceClients.get_vehicle",
            return_value={
                "vehicle_id": payload["vehicle_id"],
                "vehicle_status": "active",
            },
        ), patch(
            "dispatch.services.source_clients.SourceClients.list_vehicle_operator_accesses",
            return_value=[
                {
                    "operator_company_id": payload["operator_company_id"],
                    "access_status": "active",
                }
            ],
        ), patch(
            "dispatch.services.source_clients.SourceClients.get_driver",
            return_value={
                "driver_id": payload["driver_id"],
                "company_id": payload["operator_company_id"],
            },
        ):
            response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("dispatch_assignment_id", response.data)
        self.assertEqual(response.data["operator_company_id"], payload["operator_company_id"])

    def test_admin_can_create_and_filter_outsourced_drivers(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        matching_plan = models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )
        other_plan = models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000002"),
            dispatch_date=date(2026, 3, 25),
            planned_volume=80,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )

        create_response = self.client.post(
            "/outsourced-drivers/",
            self._outsourced_driver_payload(str(matching_plan.dispatch_plan_id)),
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)

        self.client.post(
            "/outsourced-drivers/",
            {
                **self._outsourced_driver_payload(str(other_plan.dispatch_plan_id)),
                "name": "다른 외부 기사",
            },
            format="json",
        )

        response = self.client.get(
            "/outsourced-drivers/",
            {
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "dispatch_date": "2026-03-24",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "외부 기사")
        self.assertEqual(response.data[0]["dispatch_plan_id"], str(matching_plan.dispatch_plan_id))

    def test_admin_can_update_outsourced_driver(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        dispatch_plan = models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )
        outsourced_driver = models_module.OutsourcedDriver.objects.create(
            dispatch_plan=dispatch_plan,
            name="외부 기사",
            contact_number="010-9999-8888",
            vehicle_note="1톤 카고",
            memo="월말 정산 대상",
        )

        response = self.client.patch(
            f"/outsourced-drivers/{outsourced_driver.outsourced_driver_id}/",
            {
                "name": "긴급 용차",
                "contact_number": "010-2222-3333",
                "vehicle_note": "2.5톤 윙바디",
                "memo": "수정된 메모",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "긴급 용차")
        self.assertEqual(response.data["contact_number"], "010-2222-3333")
        self.assertEqual(response.data["vehicle_note"], "2.5톤 윙바디")
        self.assertEqual(response.data["memo"], "수정된 메모")

    def test_admin_can_create_and_filter_work_rules(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )

        create_response = self.client.post(
            "/work-rules/",
            self._work_rule_payload("30000000-0000-0000-0000-000000000001"),
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)

        self.client.post(
            "/work-rules/",
            {
                "company_id": "30000000-0000-0000-0000-000000000002",
                "name": "타회사 휴무",
                "system_kind": "day_off",
            },
            format="json",
        )

        response = self.client.get(
            "/work-rules/",
            {"company_id": "30000000-0000-0000-0000-000000000001"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "주말 특근")
        self.assertEqual(response.data[0]["system_kind"], "overtime")
        self.assertEqual(response.data[0]["is_in_use"], False)

    def test_work_rule_list_marks_rules_that_are_in_use(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        in_use_rule = models_module.DispatchWorkRule.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            name="주말 특근",
            system_kind=models_module.DispatchWorkRule.SystemKind.OVERTIME,
        )
        models_module.DispatchWorkRule.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            name="평일 출근",
            system_kind=models_module.DispatchWorkRule.SystemKind.WORKING,
        )
        models_module.DriverDayException.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            driver_id=UUID("10000000-0000-0000-0000-000000000001"),
            work_rule=in_use_rule,
            memo="긴급 물량 대응",
        )

        response = self.client.get(
            "/work-rules/",
            {"company_id": "30000000-0000-0000-0000-000000000001"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        usage_by_name = {item["name"]: item["is_in_use"] for item in response.data}
        self.assertEqual(usage_by_name["주말 특근"], True)
        self.assertEqual(usage_by_name["평일 출근"], False)

    def test_admin_can_create_and_filter_driver_day_exceptions(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        work_rule = models_module.DispatchWorkRule.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            name="주말 특근",
            system_kind=models_module.DispatchWorkRule.SystemKind.OVERTIME,
        )

        with patch(
            "dispatch.services.source_clients.SourceClients.get_driver",
            return_value={
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
            },
        ):
            create_response = self.client.post(
                "/driver-day-exceptions/",
                self._driver_day_exception_payload(
                    company_id="30000000-0000-0000-0000-000000000001",
                    fleet_id="40000000-0000-0000-0000-000000000001",
                    work_rule_id=str(work_rule.work_rule_id),
                ),
                format="json",
            )

        self.assertEqual(create_response.status_code, 201)

        response = self.client.get(
            "/driver-day-exceptions/",
            {
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "dispatch_date": "2026-03-24",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["driver_id"], "10000000-0000-0000-0000-000000000001")
        self.assertEqual(response.data[0]["work_rule"]["system_kind"], "overtime")

    def test_admin_can_create_dispatch_assignment_with_outsourced_driver(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        dispatch_plan = models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )
        outsourced_driver = models_module.OutsourcedDriver.objects.create(
            dispatch_plan=dispatch_plan,
            name="외부 기사",
            contact_number="010-9999-8888",
            vehicle_note="1톤 카고",
            memo="월말 정산 대상",
        )
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        payload = self._assignment_payload(str(schedule.vehicle_schedule_id))
        payload["driver_id"] = None
        payload["outsourced_driver_id"] = str(outsourced_driver.outsourced_driver_id)

        with patch(
            "dispatch.services.source_clients.SourceClients.get_vehicle",
            return_value={
                "vehicle_id": payload["vehicle_id"],
                "vehicle_status": "active",
            },
        ), patch(
            "dispatch.services.source_clients.SourceClients.list_vehicle_operator_accesses",
            return_value=[
                {
                    "operator_company_id": payload["operator_company_id"],
                    "access_status": "active",
                }
            ],
        ), patch(
            "dispatch.services.source_clients.SourceClients.get_driver",
        ) as mock_get_driver:
            response = self.client.post("/assignments/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["outsourced_driver_id"], str(outsourced_driver.outsourced_driver_id))
        mock_get_driver.assert_not_called()

    def test_admin_cannot_delete_outsourced_driver_when_assignment_exists(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        dispatch_plan = models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )
        outsourced_driver = models_module.OutsourcedDriver.objects.create(
            dispatch_plan=dispatch_plan,
            name="외부 기사",
            contact_number="010-9999-8888",
            vehicle_note="1톤 카고",
            memo="월말 정산 대상",
        )
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        models_module.DispatchAssignment.objects.create(
            vehicle_schedule=schedule,
            vehicle_id=schedule.vehicle_id,
            driver_id=None,
            outsourced_driver=outsourced_driver,
            operator_company_id=dispatch_plan.company_id,
            dispatch_date=schedule.dispatch_date,
            shift_slot=schedule.shift_slot,
            assignment_status=models_module.DispatchAssignment.AssignmentStatus.ASSIGNED,
            assigned_at=datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
        )

        response = self.client.delete(f"/outsourced-drivers/{outsourced_driver.outsourced_driver_id}/")

        self.assertEqual(response.status_code, 409)

    def test_authenticated_user_can_read_but_cannot_write(self):
        self._authenticate(self.user_token)

        self.assertEqual(self.client.get("/plans/").status_code, 200)
        self.assertEqual(
            self.client.post("/plans/", self._plan_payload(), format="json").status_code,
            403,
        )

    def test_plan_list_filters_by_company_fleet_and_dispatch_date(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        matching_plan = models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )
        models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000002"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000002"),
            dispatch_date=date(2026, 3, 25),
            planned_volume=88,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )

        response = self.client.get(
            "/plans/",
            {
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "dispatch_date": "2026-03-24",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [response.data[0]])
        self.assertEqual(response.data[0]["dispatch_plan_id"], str(matching_plan.dispatch_plan_id))

    def test_vehicle_schedule_list_filters_by_fleet_and_dispatch_date(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        matching_schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000002"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000002"),
            dispatch_date=date(2026, 3, 25),
            shift_slot="B",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )

        response = self.client.get(
            "/vehicle-schedules/",
            {
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "dispatch_date": "2026-03-24",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [response.data[0]])
        self.assertEqual(response.data[0]["vehicle_schedule_id"], str(matching_schedule.vehicle_schedule_id))

    def test_assignment_list_filters_by_dispatch_date_and_status(self):
        models_module = _load_models_module(self)
        self._authenticate(self.admin_token)
        matching_schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        other_schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000002"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000002"),
            dispatch_date=date(2026, 3, 25),
            shift_slot="B",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        matching_assignment = models_module.DispatchAssignment.objects.create(
            vehicle_schedule=matching_schedule,
            vehicle_id=matching_schedule.vehicle_id,
            driver_id=UUID("10000000-0000-0000-0000-000000000001"),
            operator_company_id=UUID("30000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            assignment_status=models_module.DispatchAssignment.AssignmentStatus.ASSIGNED,
            assigned_at=datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
        )
        models_module.DispatchAssignment.objects.create(
            vehicle_schedule=other_schedule,
            vehicle_id=other_schedule.vehicle_id,
            driver_id=UUID("10000000-0000-0000-0000-000000000002"),
            operator_company_id=UUID("30000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 25),
            shift_slot="B",
            assignment_status=models_module.DispatchAssignment.AssignmentStatus.UNASSIGNED,
            assigned_at=datetime(2026, 3, 25, 9, 0, tzinfo=timezone.utc),
            unassigned_at=datetime(2026, 3, 25, 12, 0, tzinfo=timezone.utc),
        )

        response = self.client.get(
            "/assignments/",
            {
                "dispatch_date": "2026-03-24",
                "assignment_status": "assigned",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [response.data[0]])
        self.assertEqual(response.data[0]["dispatch_assignment_id"], str(matching_assignment.dispatch_assignment_id))
