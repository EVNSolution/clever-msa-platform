import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSettlementInquiryPayload,
  buildSettlementPreview,
  getTemporarySettlementOverlayForMonth,
  getTemporarySettlementRecord,
} from "./settlement-model";

test("getTemporarySettlementOverlayForMonth returns approved april summary overlay", () => {
  const overlay = getTemporarySettlementOverlayForMonth("2026.04");

  assert.ok(overlay);
  assert.equal(overlay.summary.totalAmountText, "152,300원");
  assert.equal(overlay.byDate["2026-04-17"]?.amountText, "16,800원");
  assert.equal(overlay.byDate["2026-04-17"]?.settlementType, "regular");
});

test("buildSettlementPreview formats selected settlement fields for inquiry attachment", () => {
  const record = getTemporarySettlementRecord("2026-04-17");
  assert.ok(record);

  assert.deepEqual(buildSettlementPreview(record!), {
    dateText: "2026-04-17",
    settlementTypeText: "일반",
    boxCountText: "14개",
    unitPriceText: "1,200원",
    totalAmountText: "16,800원",
  });
});

test("buildSettlementInquiryPayload keeps message-only and optional attachment separated", () => {
  const record = getTemporarySettlementRecord("2026-04-17");
  assert.ok(record);

  assert.deepEqual(
    buildSettlementInquiryPayload({
      message: "특근인데 일반 정산 됐어요",
      includeAttachment: false,
      record: record!,
    }),
    {
      message: "특근인데 일반 정산 됐어요",
    },
  );

  assert.deepEqual(
    buildSettlementInquiryPayload({
      message: "박스 수 14개인데 1개 빠졌어요",
      includeAttachment: true,
      record: record!,
    }),
    {
      message: "박스 수 14개인데 1개 빠졌어요",
      attachment_reference: {
        daily_delivery_input_snapshot_id: "tmp-ddis-2026-04-17",
        service_date: "2026-04-17",
      },
    },
  );
});
