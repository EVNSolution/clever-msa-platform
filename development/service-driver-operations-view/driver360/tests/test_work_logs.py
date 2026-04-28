from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from django.test import TestCase
from rest_framework.test import APIClient

class WorkLogMeApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    @patch("driver360.services.work_log_service.SourceClients")
    def test_work_logs_returns_needs_link_if_no_active_link(self, mock_source_clients_class):
        # 1. Mock SourceClients to return no links
        mock_source = MagicMock()
        mock_source_clients_class.return_value = mock_source
        mock_source.list_driver_account_links.return_value = []

        # 2. Simulate a driver login
        with patch("driver360.authentication.JWTAuthentication.authenticate") as mock_auth:
            mock_principal = MagicMock()
            mock_principal.account_id = "driver-acc-123"
            mock_principal.role = "user"
            mock_auth.return_value = (mock_principal, {"sub": "driver-acc-123", "type": "access", "role": "user"})

            # 3. Request work logs
            response = self.client.get("/me/work-logs/")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["status"], "needs_link")
            self.assertEqual(response.data["logs"], [])

    @patch("driver360.services.work_log_service.SourceClients")
    def test_work_logs_combines_attendance_and_delivery_data(self, mock_source_clients_class):
        # 1. Mock SourceClients
        mock_source = MagicMock()
        mock_source_clients_class.return_value = mock_source
        
        driver_id = "driver-id-456"
        mock_source.list_driver_account_links.return_value = [
            {"driver_account_id": "driver-acc-123", "driver_id": driver_id, "unlinked_at": None}
        ]
        
        today = datetime.now().strftime("%Y-%m-%d")
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        mock_source.list_attendance_days.return_value = [
            {"attendance_date": today, "final_status": "worked"},
            {"attendance_date": yesterday, "final_status": "absent"},
        ]
        mock_source.list_delivery_input_snapshots.return_value = [
            {"service_date": today, "delivery_count": 50, "source_record_count": 10, "status": "confirmed"},
            # No delivery data for yesterday
        ]

        # 2. Simulate driver login
        with patch("driver360.authentication.JWTAuthentication.authenticate") as mock_auth:
            mock_principal = MagicMock()
            mock_principal.account_id = "driver-acc-123"
            mock_principal.role = "user"
            mock_auth.return_value = (mock_principal, {"sub": "driver-acc-123", "type": "access", "role": "user"})

            # 3. Request work logs
            response = self.client.get(f"/me/work-logs/?date_from={yesterday}&date_to={today}")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["status"], "linked")
            self.assertEqual(len(response.data["logs"]), 2)
            
            # Check descending order
            self.assertEqual(response.data["logs"][0]["date"], today)
            self.assertEqual(response.data["logs"][0]["attendance"]["final_status"], "worked")
            self.assertEqual(response.data["logs"][0]["delivery_history"]["delivery_count"], 50)
            
            self.assertEqual(response.data["logs"][1]["date"], yesterday)
            self.assertEqual(response.data["logs"][1]["attendance"]["final_status"], "absent")
            self.assertEqual(response.data["logs"][1]["delivery_history"]["delivery_count"], 0)
