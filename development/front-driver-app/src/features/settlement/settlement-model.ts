import type {
  WorkLogSettlementOverlay,
  WorkLogSettlementType,
  WorkLogsResult,
} from "@/features/driver/work-logs-model";

export type TemporarySettlementRecord = {
  serviceDate: string;
  dailyDeliveryInputSnapshotId: string;
  settlementType: WorkLogSettlementType;
  boxCount: number;
  unitPrice: number;
  totalAmount: number;
};

export type SettlementPreview = {
  dateText: string;
  settlementTypeText: string;
  boxCountText: string;
  unitPriceText: string;
  totalAmountText: string;
};

export type SettlementInquiryPayload = {
  message: string;
  attachment_reference?: {
    daily_delivery_input_snapshot_id: string;
    service_date: string;
  };
};

type TemporarySettlementMonth = {
  monthLabel: string;
  summary: {
    regularDaysText: string;
    specialDaysText: string;
    totalAmountText: string;
  };
  byDate: Record<string, TemporarySettlementRecord>;
};

function formatWon(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function createRecord(
  serviceDate: string,
  settlementType: WorkLogSettlementType,
  boxCount: number,
  unitPrice: number,
): TemporarySettlementRecord {
  return {
    serviceDate,
    dailyDeliveryInputSnapshotId: `tmp-ddis-${serviceDate}`,
    settlementType,
    boxCount,
    unitPrice,
    totalAmount: boxCount * unitPrice,
  };
}

const APRIL_2026: TemporarySettlementMonth = {
  monthLabel: "2026.04",
  summary: {
    regularDaysText: "19일",
    specialDaysText: "4일",
    totalAmountText: "152,300원",
  },
  byDate: {
    "2026-04-01": createRecord("2026-04-01", "regular", 8, 525),
    "2026-04-02": createRecord("2026-04-02", "regular", 10, 420),
    "2026-04-03": createRecord("2026-04-03", "regular", 7, 600),
    "2026-04-04": createRecord("2026-04-04", "regular", 12, 375),
    "2026-04-07": createRecord("2026-04-07", "regular", 11, 409),
    "2026-04-08": createRecord("2026-04-08", "regular", 14, 320),
    "2026-04-09": createRecord("2026-04-09", "regular", 10, 450),
    "2026-04-10": createRecord("2026-04-10", "regular", 14, 336),
    "2026-04-11": createRecord("2026-04-11", "special", 9, 500),
    "2026-04-13": createRecord("2026-04-13", "regular", 12, 375),
    "2026-04-14": createRecord("2026-04-14", "regular", 11, 409),
    "2026-04-15": createRecord("2026-04-15", "regular", 9, 500),
    "2026-04-16": createRecord("2026-04-16", "special", 7, 600),
    "2026-04-17": createRecord("2026-04-17", "regular", 14, 1200),
    "2026-04-18": createRecord("2026-04-18", "special", 10, 470),
    "2026-04-20": createRecord("2026-04-20", "regular", 14, 350),
    "2026-04-21": createRecord("2026-04-21", "regular", 8, 525),
    "2026-04-22": createRecord("2026-04-22", "regular", 5, 840),
    "2026-04-23": createRecord("2026-04-23", "regular", 11, 409),
    "2026-04-24": createRecord("2026-04-24", "special", 13, 362),
    "2026-04-27": createRecord("2026-04-27", "regular", 12, 392),
    "2026-04-28": createRecord("2026-04-28", "regular", 10, 420),
    "2026-04-29": createRecord("2026-04-29", "regular", 11, 427),
  },
};

const TEMPORARY_SETTLEMENT_MONTHS: Record<string, TemporarySettlementMonth> = {
  [APRIL_2026.monthLabel]: APRIL_2026,
};

export function getTemporarySettlementMonthLabels(): string[] {
  return Object.keys(TEMPORARY_SETTLEMENT_MONTHS).sort();
}

export function buildTemporarySettlementCalendarResult(monthLabel: string): WorkLogsResult {
  const month = TEMPORARY_SETTLEMENT_MONTHS[monthLabel];
  if (!month) {
    return {
      status: "linked",
      logs: [],
    };
  }

  return {
    status: "linked",
    logs: Object.values(month.byDate).map((record) => ({
      date: record.serviceDate,
      attendance: {
        finalStatus: record.settlementType === "special" ? "special" : "approved",
      },
      deliveryHistory: {
        deliveryCount: record.boxCount,
        sourceRecordCount: record.boxCount,
        status: "ready",
      },
    })),
  };
}

export function getTemporarySettlementOverlayForMonth(
  monthLabel: string,
): WorkLogSettlementOverlay | undefined {
  const month = TEMPORARY_SETTLEMENT_MONTHS[monthLabel];
  if (!month) {
    return undefined;
  }

  const byDate: WorkLogSettlementOverlay["byDate"] = {};
  for (const [date, record] of Object.entries(month.byDate)) {
    byDate[date] = {
      amountText: formatWon(record.totalAmount),
      settlementType: record.settlementType,
    };
  }

  return {
    byDate,
    summary: month.summary,
  };
}

export function getTemporarySettlementRecord(
  serviceDate: string,
  monthLabel?: string,
): TemporarySettlementRecord | null {
  if (monthLabel) {
    return TEMPORARY_SETTLEMENT_MONTHS[monthLabel]?.byDate[serviceDate] ?? null;
  }

  for (const month of Object.values(TEMPORARY_SETTLEMENT_MONTHS)) {
    if (month.byDate[serviceDate]) {
      return month.byDate[serviceDate];
    }
  }

  return null;
}

export function getDefaultSettlementDateForMonth(monthLabel: string): string | null {
  const month = TEMPORARY_SETTLEMENT_MONTHS[monthLabel];
  if (!month) {
    return null;
  }

  return Object.keys(month.byDate).sort()[0] ?? null;
}

export function buildSettlementPreview(record: TemporarySettlementRecord): SettlementPreview {
  return {
    dateText: record.serviceDate,
    settlementTypeText: record.settlementType === "special" ? "특근" : "일반",
    boxCountText: `${record.boxCount.toLocaleString("ko-KR")}개`,
    unitPriceText: formatWon(record.unitPrice),
    totalAmountText: formatWon(record.totalAmount),
  };
}

export function buildSettlementInquiryPayload({
  message,
  includeAttachment,
  record,
}: {
  message: string;
  includeAttachment: boolean;
  record: TemporarySettlementRecord | null;
}): SettlementInquiryPayload {
  const trimmedMessage = message.trim();

  if (!includeAttachment || !record) {
    return {
      message: trimmedMessage,
    };
  }

  return {
    message: trimmedMessage,
    attachment_reference: {
      daily_delivery_input_snapshot_id: record.dailyDeliveryInputSnapshotId,
      service_date: record.serviceDate,
    },
  };
}
