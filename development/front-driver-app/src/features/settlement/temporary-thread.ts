import { getTemporarySettlementRecord, type TemporarySettlementRecord } from "./settlement-model";

export type SettlementThreadMessage = {
  id: string;
  sender: "driver" | "operator";
  sentAt: string;
  text: string;
  attachmentRecord?: TemporarySettlementRecord | null;
};

let temporarySettlementThread: SettlementThreadMessage[] = createInitialThread();

function createInitialThread(): SettlementThreadMessage[] {
  return [
    {
      id: "operator-1",
      sender: "operator",
      sentAt: "09:10",
      text: "정산 문의는 같은 채팅방에서 계속 이어집니다. 필요하면 정산 기준값만 다시 첨부해 주세요.",
      attachmentRecord: null,
    },
    {
      id: "driver-1",
      sender: "driver",
      sentAt: "09:18",
      text: "박스 수 14개인데 1개 빠졌어요.",
      attachmentRecord: getTemporarySettlementRecord("2026-04-17"),
    },
    {
      id: "operator-2",
      sender: "operator",
      sentAt: "09:24",
      text: "확인 중입니다. 첨부된 기준값으로 원천 기록과 대조해보겠습니다.",
      attachmentRecord: null,
    },
    {
      id: "driver-2",
      sender: "driver",
      sentAt: "09:31",
      text: "방금 다시 보니 특근 포함인지도 확인 부탁드려요.",
      attachmentRecord: null,
    },
    {
      id: "operator-3",
      sender: "operator",
      sentAt: "09:34",
      text: "추가 확인하겠습니다. 이 메시지는 메타데이터 없이 일반 채팅으로만 남았습니다.",
      attachmentRecord: null,
    },
  ];
}

function formatThreadTime(now = new Date()): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function getTemporarySettlementThread(): SettlementThreadMessage[] {
  return temporarySettlementThread.map((message) => ({ ...message }));
}

export function appendTemporarySettlementThreadMessage({
  sender,
  text,
  attachmentRecord,
}: {
  sender: "driver" | "operator";
  text: string;
  attachmentRecord?: TemporarySettlementRecord | null;
}) {
  const message: SettlementThreadMessage = {
    id: `${sender}-${Date.now()}`,
    sender,
    sentAt: formatThreadTime(),
    text: text.trim(),
    attachmentRecord: attachmentRecord ?? null,
  };

  temporarySettlementThread = [...temporarySettlementThread, message];
  return message;
}

export function resetTemporarySettlementThread() {
  temporarySettlementThread = createInitialThread();
}
