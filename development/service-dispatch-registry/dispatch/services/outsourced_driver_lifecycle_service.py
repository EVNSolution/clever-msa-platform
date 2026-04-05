from django.utils import timezone
from rest_framework.exceptions import ValidationError

from dispatch.exceptions import ServiceUnavailableError
from dispatch.models import OutsourcedDriver
from dispatch.services.source_clients import SourceClients, SourceServiceError


class OutsourcedDriverArchiveBlockedError(Exception):
    """Raised when archival is not allowed yet."""


class OutsourcedDriverLifecycleService:
    def __init__(self, source_clients: SourceClients | None = None):
        self.source_clients = source_clients or SourceClients()

    def archive(self, outsourced_driver: OutsourcedDriver, *, authorization: str) -> OutsourcedDriver:
        if outsourced_driver.status != OutsourcedDriver.Status.ACTIVE:
            raise ValidationError({"status": ["Only active outsourced drivers can be archived."]})

        dispatch_plan = outsourced_driver.dispatch_plan
        try:
            snapshots = self.source_clients.list_daily_delivery_input_snapshots(
                company_id=str(dispatch_plan.company_id),
                fleet_id=str(dispatch_plan.fleet_id),
                service_date=str(dispatch_plan.dispatch_date),
                status="active",
                authorization=authorization,
            )
        except SourceServiceError as exc:
            raise ServiceUnavailableError("Delivery record service is unavailable.") from exc

        if not snapshots:
            raise OutsourcedDriverArchiveBlockedError

        outsourced_driver.status = OutsourcedDriver.Status.ARCHIVED
        outsourced_driver.archived_at = timezone.now()
        outsourced_driver.save(update_fields=["status", "archived_at", "updated_at"])
        return outsourced_driver
