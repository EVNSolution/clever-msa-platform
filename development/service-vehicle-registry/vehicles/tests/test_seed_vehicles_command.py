from datetime import datetime, timezone
from unittest.mock import Mock

from django.core.management import call_command
from django.test import TestCase

from vehicles.models import VehicleMaster, VehicleOperatorAccess


class SeedVehiclesCommandTests(TestCase):
    def test_seed_command_creates_deterministic_vehicle_master_and_operator_access(self):
        call_command("seed_vehicles", stdout=Mock())

        self.assertEqual(VehicleMaster.objects.count(), 1)
        self.assertEqual(VehicleOperatorAccess.objects.count(), 1)

        vehicle = VehicleMaster.objects.get(vehicle_id="50000000-0000-0000-0000-000000000001")
        self.assertEqual(
            str(vehicle.manufacturer_company_id),
            "30000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(vehicle.plate_number, "12가3456")
        self.assertEqual(vehicle.vin, "VIN-000000000000001")
        self.assertEqual(vehicle.manufacturer_vehicle_code, "MODEL-0001")
        self.assertEqual(vehicle.model_name, "Cargo Van")
        self.assertEqual(vehicle.vehicle_status, VehicleMaster.VehicleStatus.ACTIVE)
        self.assertIsNotNone(vehicle.created_at)
        self.assertIsNotNone(vehicle.updated_at)

        access = VehicleOperatorAccess.objects.get(
            vehicle_operator_access_id="51000000-0000-0000-0000-000000000001"
        )
        self.assertEqual(str(access.vehicle_id), str(vehicle.vehicle_id))
        self.assertEqual(
            str(access.operator_company_id),
            "30000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(access.access_status, VehicleOperatorAccess.AccessStatus.ACTIVE)
        self.assertEqual(access.started_at, datetime(2026, 1, 1, tzinfo=timezone.utc))
        self.assertIsNone(access.ended_at)
        self.assertIsNotNone(access.created_at)
        self.assertIsNotNone(access.updated_at)

    def test_seed_command_rerun_updates_existing_records_without_duplication(self):
        call_command("seed_vehicles", stdout=Mock())

        vehicle = VehicleMaster.objects.get(vehicle_id="50000000-0000-0000-0000-000000000001")
        vehicle.plate_number = "99가9999"
        vehicle.vin = "VIN-CHANGED-0000001"
        vehicle.vehicle_status = VehicleMaster.VehicleStatus.INACTIVE
        vehicle.save(update_fields=["plate_number", "vin", "vehicle_status"])

        access = VehicleOperatorAccess.objects.get(
            vehicle_operator_access_id="51000000-0000-0000-0000-000000000001"
        )
        access.access_status = VehicleOperatorAccess.AccessStatus.SUSPENDED
        access.ended_at = datetime(2026, 2, 1, tzinfo=timezone.utc)
        access.save(update_fields=["access_status", "ended_at"])

        call_command("seed_vehicles", stdout=Mock())

        self.assertEqual(VehicleMaster.objects.count(), 1)
        self.assertEqual(VehicleOperatorAccess.objects.count(), 1)

        vehicle.refresh_from_db()
        self.assertEqual(vehicle.plate_number, "12가3456")
        self.assertEqual(vehicle.vin, "VIN-000000000000001")
        self.assertEqual(vehicle.vehicle_status, VehicleMaster.VehicleStatus.ACTIVE)

        access.refresh_from_db()
        self.assertEqual(access.access_status, VehicleOperatorAccess.AccessStatus.ACTIVE)
        self.assertIsNone(access.ended_at)
