export type WorkLogStatus = "linked" | "needs_link";

export type WorkLogCard = {
  date: string;
  attendance: {
    finalStatus: string;
  };
  deliveryHistory: {
    deliveryCount: number;
    sourceRecordCount: number;
    status: string;
  };
};

export type WorkLogsResult = {
  status: WorkLogStatus;
  logs: WorkLogCard[];
};

export type WorkLogsRange = {
  dateFrom: string;
  dateTo: string;
};

export type WorkLogMarkerTone = "regular" | "special" | "none";

export type WorkLogSettlementType = Exclude<WorkLogMarkerTone, "none">;

export type WorkLogSettlementOverlay = {
  byDate: Record<
    string,
    {
      amountText: string;
      settlementType: WorkLogSettlementType;
    }
  >;
  summary: {
    regularDaysText: string;
    specialDaysText: string;
    totalAmountText: string;
  };
};

export type WorkLogsMonthCell = {
  date: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isEmpty: boolean;
  markerTone: WorkLogMarkerTone;
  primaryText: string;
  secondaryText: string;
};

export type WorkLogsMonthView = {
  monthLabel: string;
  selectedDate: string | null;
  weekdays: string[];
  weeks: WorkLogsMonthCell[][];
  summaryCards: Array<{
    label: string;
    value: string;
  }>;
};

export type WorkLogsMonthViewOptions = {
  today?: Date;
  focusDate?: string;
  selectedDate?: string;
  settlementOverlay?: WorkLogSettlementOverlay;
};

type WorkLogsResponse = {
  status?: string;
  logs?: Array<{
    date?: string;
    attendance?: {
      final_status?: string;
    };
    delivery_history?: {
      delivery_count?: number;
      source_record_count?: number;
      status?: string;
    };
  }>;
};

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}.${month}`;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildDefaultWorkLogsRange(today = new Date()): WorkLogsRange {
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  return {
    dateFrom: formatDate(startDate),
    dateTo: formatDate(today),
  };
}

export function normalizeWorkLogsResponse(payload: WorkLogsResponse): WorkLogsResult {
  const status = payload.status === "needs_link" ? "needs_link" : "linked";
  const logs = Array.isArray(payload.logs)
    ? payload.logs
        .filter((log): log is NonNullable<typeof payload.logs>[number] & { date: string } =>
          typeof log?.date === "string" && log.date.length > 0,
        )
        .map((log) => ({
          date: log.date,
          attendance: {
            finalStatus: log.attendance?.final_status ?? "unknown",
          },
          deliveryHistory: {
            deliveryCount: log.delivery_history?.delivery_count ?? 0,
            sourceRecordCount: log.delivery_history?.source_record_count ?? 0,
            status: log.delivery_history?.status ?? "none",
          },
        }))
    : [];

  return {
    status,
    logs,
  };
}

export function shouldBlockWorkLogs(result: WorkLogsResult): boolean {
  return result.status === "needs_link";
}

export function buildWorkLogsMonthView(
  result: WorkLogsResult,
  options: WorkLogsMonthViewOptions = {},
): WorkLogsMonthView {
  const today = options.today ?? new Date();
  const focusDate = options.focusDate ? parseDate(options.focusDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOfMonth = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const lastDayOfMonth = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0);
  const firstDayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const lastDayOffset = 6 - ((lastDayOfMonth.getDay() + 6) % 7);
  const gridStart = addDays(firstDayOfMonth, -firstDayOffset);
  const gridEnd = addDays(lastDayOfMonth, lastDayOffset);
  const todayKey = formatDate(today);
  const selectedDate =
    options.selectedDate ??
    (today.getFullYear() === firstDayOfMonth.getFullYear() &&
    today.getMonth() === firstDayOfMonth.getMonth()
      ? todayKey
      : null);
  const logMap = new Map(result.logs.map((card) => [card.date, card]));
  const settlementOverlay = options.settlementOverlay;
  const cells: WorkLogsMonthCell[] = [];
  const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const date = formatDate(cursor);
    const card = logMap.get(date);
    const settlement = settlementOverlay?.byDate[date];
    cells.push({
      date,
      dayNumber: String(cursor.getDate()),
      isCurrentMonth: cursor.getMonth() === firstDayOfMonth.getMonth(),
      isToday: date === todayKey,
      isSelected: selectedDate === date,
      isEmpty: !card,
      markerTone: settlement?.settlementType ?? "none",
      primaryText: card ? `${card.deliveryHistory.deliveryCount}박스` : "-",
      secondaryText: settlement?.amountText ?? "-",
    });
  }

  const weeks: WorkLogsMonthCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return {
    monthLabel: formatMonthLabel(firstDayOfMonth),
    selectedDate,
    weekdays,
    weeks,
    summaryCards: settlementOverlay
      ? [
          { label: "일반", value: settlementOverlay.summary.regularDaysText },
          { label: "특근", value: settlementOverlay.summary.specialDaysText },
          { label: "정산 금액", value: settlementOverlay.summary.totalAmountText },
        ]
      : [
          { label: "일반", value: "-" },
          { label: "특근", value: "-" },
          { label: "정산 금액", value: "-" },
        ],
  };
}
