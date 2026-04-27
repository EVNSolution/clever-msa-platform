from django.db import transaction

from dispatch.exceptions import ServiceUnavailableError
from dispatch.models import DispatchUploadBatch, DispatchUploadRow
from dispatch.services.source_clients import SourceClients, SourceServiceError


class DispatchUploadService:
    def preview_upload(
        self,
        *,
        dispatch_plan,
        company_id,
        fleet_id,
        dispatch_date,
        rows: list[dict],
        source_filename: str,
        authorization: str,
    ) -> DispatchUploadBatch:
        with transaction.atomic():
            batch = DispatchUploadBatch.objects.create(
                dispatch_plan=dispatch_plan,
                company_id=company_id,
                fleet_id=fleet_id,
                dispatch_date=dispatch_date,
                source_filename=source_filename,
                upload_status=DispatchUploadBatch.UploadStatus.DRAFT,
            )
            for index, row in enumerate(rows, start=1):
                external_user_name = row["delivery_manager_name"].strip()
                DispatchUploadRow.objects.create(
                    upload_batch=batch,
                    row_index=index,
                    external_user_name=external_user_name,
                    small_region_text=row.get("small_region_text", ""),
                    detailed_region_text=row.get("detailed_region_text", ""),
                    box_count=row.get("box_count", 0),
                    household_count=row.get("household_count", 0),
                    matched_driver_id=self._match_driver_id(
                        external_user_name=external_user_name,
                        company_id=str(company_id),
                        fleet_id=str(fleet_id),
                        authorization=authorization,
                    ),
                )
        return DispatchUploadBatch.objects.prefetch_related("rows").get(upload_batch_id=batch.upload_batch_id)

    def confirm_upload(self, *, upload_batch: DispatchUploadBatch, authorization: str) -> DispatchUploadBatch:
        with transaction.atomic():
            upload_batch.upload_status = DispatchUploadBatch.UploadStatus.CONFIRMED
            upload_batch.save(update_fields=["upload_status", "updated_at"])
            try:
                SourceClients().sync_attendance_dispatch_signals(
                    dispatch_date=str(upload_batch.dispatch_date),
                    rows=self._attendance_rows(upload_batch),
                    authorization=authorization,
                )
            except SourceServiceError as exc:
                raise ServiceUnavailableError("Attendance sync is unavailable.") from exc

        return DispatchUploadBatch.objects.prefetch_related("rows").get(upload_batch_id=upload_batch.upload_batch_id)

    def _match_driver_id(self, *, external_user_name: str, company_id: str, fleet_id: str, authorization: str):
        if not external_user_name:
            return None
        matches = SourceClients().list_drivers_by_external_user_name(
            external_user_name=external_user_name,
            company_id=company_id,
            fleet_id=fleet_id,
            authorization=authorization,
        )
        if not matches:
            return None
        return matches[0].get("driver_id")

    def _attendance_rows(self, upload_batch: DispatchUploadBatch) -> list[dict]:
        return [
            {
                "upload_batch_id": str(row.upload_batch_id),
                "upload_row_id": str(row.upload_row_id),
                "matched_driver_id": str(row.matched_driver_id) if row.matched_driver_id else None,
                "small_region_text": row.small_region_text,
                "detailed_region_text": row.detailed_region_text,
                "box_count": row.box_count,
                "household_count": row.household_count,
            }
            for row in upload_batch.rows.all()
            if row.matched_driver_id
        ]
