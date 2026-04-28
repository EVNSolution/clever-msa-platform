from datetime import datetime, timedelta
from driver360.services.source_clients import SourceClients


class WorkLogService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def list_work_logs(self, *, driver_account_id: str, date_from: str, date_to: str, authorization: str):
        # 1. Fetch active driver account link
        links = self.source_clients.list_driver_account_links(
            driver_account_id=driver_account_id,
            authorization=authorization,
        )
        active_link = next((link for link in links if link.get("unlinked_at") is None), None)

        if not active_link:
            return {"status": "needs_link", "logs": []}

        driver_id = active_link["driver_id"]

        # 2. Generate date range
        start_date = datetime.strptime(date_from, "%Y-%m-%d")
        end_date = datetime.strptime(date_to, "%Y-%m-%d")
        dates = [
            (start_date + timedelta(days=x)).strftime("%Y-%m-%d")
            for x in range((end_date - start_date).days + 1)
        ]

        # 3. Fetch data from sources
        attendance_days = self.source_clients.list_attendance_days(
            driver_id=driver_id,
            dates=dates,
            authorization=authorization,
        )
        delivery_snapshots = self.source_clients.list_delivery_input_snapshots(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )

        # 4. Combine data by date
        attendance_map = {day["attendance_date"]: day for day in attendance_days}
        delivery_map = {snap["service_date"]: snap for snap in delivery_snapshots}

        logs = []
        for date_str in reversed(dates):  # Descending order by date
            attendance = attendance_map.get(date_str)
            delivery = delivery_map.get(date_str)

            # If no data at all for this date, we might skip it or show empty
            if not attendance and not delivery:
                continue

            logs.append({
                "date": date_str,
                "attendance": {
                    "final_status": attendance["final_status"] if attendance else "unknown",
                },
                "delivery_history": {
                    "delivery_count": delivery["delivery_count"] if delivery else 0,
                    "source_record_count": delivery["source_record_count"] if delivery else 0,
                    "status": delivery["status"] if delivery else "none",
                }
            })

        return {"status": "linked", "logs": logs}
