import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkLogsMonthView,
  buildDefaultWorkLogsRange,
  normalizeWorkLogsResponse,
  shouldBlockWorkLogs,
} from "./work-logs-model";

test("buildDefaultWorkLogsRange follows the backend 30-day inclusive window", () => {
  assert.deepEqual(
    buildDefaultWorkLogsRange(new Date("2026-04-21T09:00:00+09:00")),
    {
      dateFrom: "2026-03-22",
      dateTo: "2026-04-21",
    },
  );
});

test("normalizeWorkLogsResponse preserves needs_link without cards", () => {
  assert.deepEqual(
    normalizeWorkLogsResponse({
      status: "needs_link",
      logs: [],
    }),
    {
      status: "needs_link",
      logs: [],
    },
  );
});

test("normalizeWorkLogsResponse maps snake_case payloads into card-friendly objects", () => {
  assert.deepEqual(
    normalizeWorkLogsResponse({
      status: "linked",
      logs: [
        {
          date: "2026-04-21",
          attendance: {
            final_status: "worked",
          },
          delivery_history: {
            delivery_count: 18,
            source_record_count: 18,
            status: "confirmed",
          },
        },
      ],
    }),
    {
      status: "linked",
      logs: [
        {
          date: "2026-04-21",
          attendance: {
            finalStatus: "worked",
          },
          deliveryHistory: {
            deliveryCount: 18,
            sourceRecordCount: 18,
            status: "confirmed",
          },
        },
      ],
    },
  );
});

test("shouldBlockWorkLogs returns true only for needs_link", () => {
  assert.equal(
    shouldBlockWorkLogs({
      status: "needs_link",
      logs: [],
    }),
    true,
  );
  assert.equal(
    shouldBlockWorkLogs({
      status: "linked",
      logs: [],
    }),
    false,
  );
});

test("buildWorkLogsMonthView creates a Monday-first month grid and selects today", () => {
  const view = buildWorkLogsMonthView(
    {
      status: "linked",
      logs: [
        {
          date: "2026-04-17",
          attendance: {
            finalStatus: "worked",
          },
          deliveryHistory: {
            deliveryCount: 12,
            sourceRecordCount: 14,
            status: "confirmed",
          },
        },
      ],
    },
    {
      today: new Date("2026-04-17T09:00:00+09:00"),
      settlementOverlay: {
        byDate: {
          "2026-04-17": {
            amountText: "16,800원",
            settlementType: "regular",
          },
        },
        summary: {
          regularDaysText: "19일",
          specialDaysText: "4일",
          totalAmountText: "152,300원",
        },
      },
    },
  );

  assert.equal(view.monthLabel, "2026.04");
  assert.equal(view.weeks.length, 5);
  assert.deepEqual(
    view.weeks[0].map((cell) => cell.date),
    [
      "2026-03-30",
      "2026-03-31",
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-04",
      "2026-04-05",
    ],
  );

  const selected = view.weeks.flat().find((cell) => cell.date === "2026-04-17");
  assert.equal(selected?.isSelected, true);
  assert.equal(selected?.isToday, true);
  assert.equal(selected?.primaryText, "12박스");
  assert.equal(selected?.secondaryText, "16,800원");
});

test("buildWorkLogsMonthView uses explicit settlement overlay instead of inferring settlement state", () => {
  const view = buildWorkLogsMonthView(
    {
      status: "linked",
      logs: [
        {
          date: "2026-04-16",
          attendance: {
            finalStatus: "special_shift",
          },
          deliveryHistory: {
            deliveryCount: 7,
            sourceRecordCount: 8,
            status: "confirmed",
          },
        },
        {
          date: "2026-04-17",
          attendance: {
            finalStatus: "worked",
          },
          deliveryHistory: {
            deliveryCount: 12,
            sourceRecordCount: 14,
            status: "confirmed",
          },
        },
      ],
    },
    {
      today: new Date("2026-04-17T09:00:00+09:00"),
      settlementOverlay: {
        byDate: {
          "2026-04-16": {
            amountText: "10,500원",
            settlementType: "regular",
          },
          "2026-04-17": {
            amountText: "16,800원",
            settlementType: "special",
          },
        },
        summary: {
          regularDaysText: "19일",
          specialDaysText: "4일",
          totalAmountText: "152,300원",
        },
      },
    },
  );

  const april16 = view.weeks.flat().find((cell) => cell.date === "2026-04-16");
  const april17 = view.weeks.flat().find((cell) => cell.date === "2026-04-17");

  assert.equal(april16?.markerTone, "regular");
  assert.equal(april17?.markerTone, "special");
  assert.deepEqual(view.summaryCards, [
    { label: "일반", value: "19일" },
    { label: "특근", value: "4일" },
    { label: "정산 금액", value: "152,300원" },
  ]);
});

test("buildWorkLogsMonthView keeps empty in-month cells readable and leaves settlement fields blank without overlay", () => {
  const view = buildWorkLogsMonthView(
    {
      status: "linked",
      logs: [
        {
          date: "2026-04-18",
          attendance: {
            finalStatus: "worked",
          },
          deliveryHistory: {
            deliveryCount: 10,
            sourceRecordCount: 11,
            status: "confirmed",
          },
        },
      ],
    },
    {
      today: new Date("2026-04-17T09:00:00+09:00"),
    },
  );

  const april18 = view.weeks.flat().find((cell) => cell.date === "2026-04-18");
  const march31 = view.weeks.flat().find((cell) => cell.date === "2026-03-31");

  assert.equal(april18?.isCurrentMonth, true);
  assert.equal(april18?.isEmpty, false);
  assert.equal(april18?.markerTone, "none");
  assert.equal(april18?.primaryText, "10박스");
  assert.equal(april18?.secondaryText, "-");
  assert.equal(march31?.isCurrentMonth, false);
  assert.deepEqual(view.summaryCards, [
    { label: "일반", value: "-" },
    { label: "특근", value: "-" },
    { label: "정산 금액", value: "-" },
  ]);
});
