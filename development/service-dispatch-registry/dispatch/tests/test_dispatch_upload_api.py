from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch
from uuid import UUID, uuid4

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from dispatch.models import DispatchPlan, DispatchUploadBatch
from dispatch.services.source_clients import SourceServiceError


class DispatchUploadApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.admin_token = self._issue_token("admin", allowed_nav_keys=["dispatch"])
        self.dispatch_plan = DispatchPlan.objects.create(
            dispatch_plan_id=UUID("60000000-0000-0000-0000-000000000001"),
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=DispatchPlan.DispatchStatus.DRAFT,
        )

    def _issue_token(
        self,
        role: str,
        *,
        allowed_nav_keys: list[str] | None = None,
        extra_claims: dict | None = None,
    ) -> str:
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
        if allowed_nav_keys is not None:
            payload["allowed_nav_keys"] = allowed_nav_keys
        if extra_claims:
            payload.update(extra_claims)
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def _authenticate(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    def test_preview_upload_creates_rows_with_driver_matches(self, mock_list_drivers):
        self._authenticate(self.admin_token)
        mock_list_drivers.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "external_user_name": "ZD홍길동",
            }
        ]

        response = self.client.post(
            "/upload-batches/preview/",
            {
                "dispatch_plan_id": str(self.dispatch_plan.dispatch_plan_id),
                "rows": [
                    {
                        "delivery_manager_name": "ZD홍길동",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 133,
                        "household_count": 90,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["upload_status"], "draft")
        self.assertEqual(response.data["rows"][0]["matched_driver_id"], "10000000-0000-0000-0000-000000000001")
        mock_list_drivers.assert_called_once_with(
            external_user_name="ZD홍길동",
            company_id=str(self.dispatch_plan.company_id),
            fleet_id=str(self.dispatch_plan.fleet_id),
            authorization=f"Bearer {self.admin_token}",
        )

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    def test_preview_upload_can_start_without_dispatch_plan(self, mock_list_drivers):
        self._authenticate(self.admin_token)
        mock_list_drivers.return_value = []

        response = self.client.post(
            "/upload-batches/preview/",
            {
                "company_id": str(self.dispatch_plan.company_id),
                "fleet_id": str(self.dispatch_plan.fleet_id),
                "dispatch_date": str(self.dispatch_plan.dispatch_date),
                "rows": [
                    {
                        "delivery_manager_name": "ZD없는기사",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 12,
                        "household_count": 4,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["dispatch_plan_id"])
        self.assertEqual(response.data["company_id"], str(self.dispatch_plan.company_id))
        self.assertEqual(response.data["fleet_id"], str(self.dispatch_plan.fleet_id))
        self.assertEqual(response.data["dispatch_date"], str(self.dispatch_plan.dispatch_date))

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    def test_preview_upload_rejects_cross_company_scope_for_manager_session(self, mock_list_drivers):
        manager_token = self._issue_token(
            "admin",
            allowed_nav_keys=["dispatch"],
            extra_claims={
                "active_account_type": "manager",
                "company_id": str(self.dispatch_plan.company_id),
                "role_type": "fleet_manager",
            },
        )
        self._authenticate(manager_token)
        mock_list_drivers.return_value = []

        response = self.client.post(
            "/upload-batches/preview/",
            {
                "company_id": "30000000-0000-0000-0000-000000000099",
                "fleet_id": str(self.dispatch_plan.fleet_id),
                "dispatch_date": str(self.dispatch_plan.dispatch_date),
                "rows": [
                    {
                        "delivery_manager_name": "ZD없는기사",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 12,
                        "household_count": 4,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("company_id", response.data["details"])
        mock_list_drivers.assert_not_called()

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    def test_preview_upload_trims_external_user_name_and_keeps_unmatched_rows(self, mock_list_drivers):
        self._authenticate(self.admin_token)
        mock_list_drivers.return_value = []

        response = self.client.post(
            "/upload-batches/preview/",
            {
                "dispatch_plan_id": str(self.dispatch_plan.dispatch_plan_id),
                "rows": [
                    {
                        "delivery_manager_name": "  ZD없는기사  ",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 11,
                        "household_count": 3,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rows"][0]["external_user_name"], "ZD없는기사")
        self.assertIsNone(response.data["rows"][0]["matched_driver_id"])
        mock_list_drivers.assert_called_once_with(
            external_user_name="ZD없는기사",
            company_id=str(self.dispatch_plan.company_id),
            fleet_id=str(self.dispatch_plan.fleet_id),
            authorization=f"Bearer {self.admin_token}",
        )

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    @patch("dispatch.services.source_clients.SourceClients.sync_attendance_dispatch_signals")
    def test_confirm_upload_marks_batch_confirmed(self, mock_sync_attendance, mock_list_drivers):
        self._authenticate(self.admin_token)
        mock_list_drivers.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "external_user_name": "ZD홍길동",
            }
        ]
        mock_sync_attendance.return_value = {
            "days": [
                {
                    "driver_id": "10000000-0000-0000-0000-000000000001",
                    "attendance_date": "2026-03-24",
                    "final_status": "worked",
                }
            ]
        }

        preview_response = self.client.post(
            "/upload-batches/preview/",
            {
                "dispatch_plan_id": str(self.dispatch_plan.dispatch_plan_id),
                "rows": [
                    {
                        "delivery_manager_name": "ZD홍길동",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 133,
                        "household_count": 90,
                    }
                ],
            },
            format="json",
        )

        response = self.client.post(
            f"/upload-batches/{preview_response.data['upload_batch_id']}/confirm/",
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["upload_status"], "confirmed")
        mock_sync_attendance.assert_called_once_with(
            dispatch_date="2026-03-24",
            rows=[
                {
                    "upload_batch_id": preview_response.data["upload_batch_id"],
                    "upload_row_id": preview_response.data["rows"][0]["upload_row_id"],
                    "matched_driver_id": "10000000-0000-0000-0000-000000000001",
                    "small_region_text": "10H2",
                    "detailed_region_text": "10H2-가",
                    "box_count": 133,
                    "household_count": 90,
                }
            ],
            authorization=f"Bearer {self.admin_token}",
        )

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    @patch("dispatch.services.source_clients.SourceClients.sync_attendance_dispatch_signals")
    def test_confirm_upload_keeps_batch_draft_when_attendance_sync_fails(
        self,
        mock_sync_attendance,
        mock_list_drivers,
    ):
        self._authenticate(self.admin_token)
        mock_list_drivers.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "external_user_name": "ZD홍길동",
            }
        ]
        mock_sync_attendance.side_effect = SourceServiceError("Attendance sync failed.")

        preview_response = self.client.post(
            "/upload-batches/preview/",
            {
                "dispatch_plan_id": str(self.dispatch_plan.dispatch_plan_id),
                "rows": [
                    {
                        "delivery_manager_name": "ZD홍길동",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 133,
                        "household_count": 90,
                    }
                ],
            },
            format="json",
        )

        response = self.client.post(
            f"/upload-batches/{preview_response.data['upload_batch_id']}/confirm/",
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            DispatchUploadBatch.objects.get(upload_batch_id=preview_response.data["upload_batch_id"]).upload_status,
            DispatchUploadBatch.UploadStatus.DRAFT,
        )

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    @patch("dispatch.services.source_clients.SourceClients.sync_attendance_dispatch_signals")
    def test_list_confirmed_upload_batches_filters_by_scope(self, mock_sync_attendance, mock_list_drivers):
        self._authenticate(self.admin_token)
        mock_list_drivers.return_value = [
            {
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "external_user_name": "ZD홍길동",
            }
        ]
        mock_sync_attendance.return_value = {"days": []}

        preview_response = self.client.post(
            "/upload-batches/preview/",
            {
                "dispatch_plan_id": str(self.dispatch_plan.dispatch_plan_id),
                "rows": [
                    {
                        "delivery_manager_name": "ZD홍길동",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 133,
                        "household_count": 90,
                    }
                ],
            },
            format="json",
        )
        self.client.post(
            f"/upload-batches/{preview_response.data['upload_batch_id']}/confirm/",
            format="json",
        )

        response = self.client.get(
            "/upload-batches/",
            {
                "company_id": str(self.dispatch_plan.company_id),
                "fleet_id": str(self.dispatch_plan.fleet_id),
                "dispatch_date": str(self.dispatch_plan.dispatch_date),
                "upload_status": "confirmed",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["upload_status"], "confirmed")
        self.assertEqual(response.data[0]["rows"][0]["matched_driver_id"], "10000000-0000-0000-0000-000000000001")

    @patch("dispatch.services.source_clients.SourceClients.list_drivers_by_external_user_name")
    @patch("dispatch.services.source_clients.SourceClients.sync_attendance_dispatch_signals")
    def test_list_upload_batches_is_scoped_to_session_company_for_manager(
        self,
        mock_sync_attendance,
        mock_list_drivers,
    ):
        self._authenticate(self.admin_token)
        mock_list_drivers.return_value = []
        mock_sync_attendance.return_value = {"days": []}

        primary_batch = self.client.post(
            "/upload-batches/preview/",
            {
                "company_id": str(self.dispatch_plan.company_id),
                "fleet_id": str(self.dispatch_plan.fleet_id),
                "dispatch_date": str(self.dispatch_plan.dispatch_date),
                "rows": [
                    {
                        "delivery_manager_name": "ZD기사A",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-가",
                        "box_count": 12,
                        "household_count": 4,
                    }
                ],
            },
            format="json",
        )
        self.client.post(f"/upload-batches/{primary_batch.data['upload_batch_id']}/confirm/", format="json")

        secondary_batch = self.client.post(
            "/upload-batches/preview/",
            {
                "company_id": "30000000-0000-0000-0000-000000000099",
                "fleet_id": str(self.dispatch_plan.fleet_id),
                "dispatch_date": str(self.dispatch_plan.dispatch_date),
                "rows": [
                    {
                        "delivery_manager_name": "ZD기사B",
                        "small_region_text": "10H2",
                        "detailed_region_text": "10H2-나",
                        "box_count": 8,
                        "household_count": 2,
                    }
                ],
            },
            format="json",
        )
        self.client.post(f"/upload-batches/{secondary_batch.data['upload_batch_id']}/confirm/", format="json")

        manager_token = self._issue_token(
            "admin",
            allowed_nav_keys=["dispatch"],
            extra_claims={
                "active_account_type": "manager",
                "company_id": str(self.dispatch_plan.company_id),
                "role_type": "fleet_manager",
            },
        )
        self._authenticate(manager_token)

        response = self.client.get(
            "/upload-batches/",
            {
                "company_id": "30000000-0000-0000-0000-000000000099",
                "fleet_id": str(self.dispatch_plan.fleet_id),
                "dispatch_date": str(self.dispatch_plan.dispatch_date),
                "upload_status": "confirmed",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["company_id"], str(self.dispatch_plan.company_id))
