import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";

import {
  buildSettlementInquiryPayload,
  buildSettlementPreview,
  getDefaultSettlementDateForMonth,
  getTemporarySettlementRecord,
} from "./settlement-model";
import { SettlementShell } from "./settlement-shell";
import {
  appendTemporarySettlementThreadMessage,
  getTemporarySettlementThread,
  type SettlementThreadMessage,
} from "./temporary-thread";

function MessageBubble({ message }: { message: SettlementThreadMessage }) {
  const isDriver = message.sender === "driver";
  const preview = message.attachmentRecord ? buildSettlementPreview(message.attachmentRecord) : null;

  return (
    <View style={[styles.threadBlock, isDriver ? styles.driverBlock : styles.operatorBlock]}>
      <Text style={styles.threadSender}>{isDriver ? "나" : "정산 담당"}</Text>
      {preview ? (
        <View style={[styles.attachmentCard, isDriver ? styles.driverAttachmentCard : null]}>
          <View style={styles.attachmentHeader}>
            <Text style={styles.attachmentTitle}>정산 기준 첨부</Text>
            <Text style={styles.attachmentDate}>{preview.dateText}</Text>
          </View>
          <View style={styles.attachmentGrid}>
            <View style={styles.attachmentItem}>
              <Text style={styles.attachmentLabel}>정산 타입</Text>
              <Text style={styles.attachmentValue}>{preview.settlementTypeText}</Text>
            </View>
            <View style={styles.attachmentItem}>
              <Text style={styles.attachmentLabel}>박스 수</Text>
              <Text style={styles.attachmentValue}>{preview.boxCountText}</Text>
            </View>
            <View style={styles.attachmentItem}>
              <Text style={styles.attachmentLabel}>박스당 단가</Text>
              <Text style={styles.attachmentValue}>{preview.unitPriceText}</Text>
            </View>
            <View style={styles.attachmentItem}>
              <Text style={styles.attachmentLabel}>총 정산액</Text>
              <Text style={styles.attachmentValue}>{preview.totalAmountText}</Text>
            </View>
          </View>
        </View>
      ) : null}
      <View style={[styles.bubble, isDriver ? styles.driverBubble : styles.operatorBubble]}>
        <Text style={styles.bubbleText}>{message.text}</Text>
      </View>
      <Text style={styles.threadTime}>{message.sentAt}</Text>
    </View>
  );
}

export function SettlementChatScreen() {
  const { session, isBootstrapping } = useAuthSession();
  const params = useLocalSearchParams<{ serviceDate?: string }>();
  const [messages, setMessages] = useState<SettlementThreadMessage[]>(() => getTemporarySettlementThread());
  const [includeAttachment, setIncludeAttachment] = useState(true);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }
    if (!session || session.activeAccountType !== "driver") {
      router.replace("/login");
    }
  }, [isBootstrapping, session]);

  const selectedDate =
    typeof params.serviceDate === "string" && params.serviceDate.length > 0
      ? params.serviceDate
      : getDefaultSettlementDateForMonth("2026.04") ?? undefined;
  const selectedRecord = selectedDate ? getTemporarySettlementRecord(selectedDate) : null;
  const selectedPreview = useMemo(
    () => (selectedRecord ? buildSettlementPreview(selectedRecord) : null),
    [selectedRecord],
  );

  function handleSend() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    const payload = buildSettlementInquiryPayload({
      message: trimmedDraft,
      includeAttachment,
      record: selectedRecord,
    });
    console.debug("temporary_settlement_inquiry_submit", payload);

    appendTemporarySettlementThreadMessage({
      sender: "driver",
      text: payload.message,
      attachmentRecord: payload.attachment_reference ? selectedRecord : null,
    });
    setMessages(getTemporarySettlementThread());
    setDraft("");
  }

  return (
    <SettlementShell
      title="정산 문의"
      headerTools="chat"
      description="정산 문의는 같은 채팅방에 계속 누적됩니다. 필요할 때만 정산 기준값을 다시 첨부합니다."
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.threadSection}>
          <Text style={styles.todayChip}>오늘</Text>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </View>

        <View style={styles.composerSection}>
          <View style={styles.attachRow}>
            <View style={styles.attachCopy}>
              <Text style={styles.attachTitle}>정산 기준 첨부</Text>
              <Text style={styles.attachDescription}>정산 일자와 내용을 첨부합니다.</Text>
            </View>
            <Pressable
              style={[styles.attachToggle, includeAttachment ? styles.attachToggleOn : null]}
              onPress={() => {
                setIncludeAttachment((current) => !current);
              }}
            >
              <Text style={[styles.attachToggleText, includeAttachment ? styles.attachToggleTextOn : null]}>
                첨부 {includeAttachment ? "ON" : "OFF"}
              </Text>
            </Pressable>
          </View>

          {includeAttachment && selectedPreview ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>첨부 미리보기</Text>
                <Text style={styles.previewMeta}>{selectedPreview.dateText} · 전송 시 함께 포함</Text>
              </View>
              <View style={styles.previewGrid}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>정산 타입</Text>
                  <Text style={styles.previewValue}>{selectedPreview.settlementTypeText}</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>박스 수</Text>
                  <Text style={styles.previewValue}>{selectedPreview.boxCountText}</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>박스당 단가</Text>
                  <Text style={styles.previewValue}>{selectedPreview.unitPriceText}</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>총 정산액</Text>
                  <Text style={styles.previewValue}>{selectedPreview.totalAmountText}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.inputWrap}>
            <TextInput
              multiline
              value={draft}
              placeholder="예: 특근인데 일반 정산 됐어요"
              placeholderTextColor="#8c98a1"
              onChangeText={setDraft}
              style={styles.input}
              textAlignVertical="top"
            />
            <Pressable
              disabled={!draft.trim()}
              onPress={handleSend}
              style={[styles.sendButton, !draft.trim() ? styles.sendButtonDisabled : null]}
            >
              <Text style={styles.sendButtonText}>전송</Text>
            </Pressable>
          </View>

          <Text style={styles.composerCaption}>같은 방 안에 계속 누적되고, 필요할 때만 기준값을 다시 붙입니다.</Text>
        </View>
      </ScrollView>
    </SettlementShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 18,
  },
  threadSection: {
    gap: 10,
  },
  todayChip: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f4f6f8",
    color: "#7b8793",
    fontSize: 11,
  },
  threadBlock: {
    gap: 6,
    maxWidth: "92%",
  },
  driverBlock: {
    alignSelf: "flex-end",
  },
  operatorBlock: {
    alignSelf: "flex-start",
  },
  threadSender: {
    fontSize: 12,
    color: "#7c8791",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  driverBubble: {
    backgroundColor: "#f8fbe1",
    borderColor: "#e1eb8b",
  },
  operatorBubble: {
    backgroundColor: "#f9fbfc",
    borderColor: "#e7edf1",
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#1f2a33",
  },
  threadTime: {
    fontSize: 11,
    color: "#8c98a1",
  },
  attachmentCard: {
    borderWidth: 1,
    borderColor: "#e7edf1",
    backgroundColor: "#ffffff",
    padding: 10,
    gap: 8,
  },
  driverAttachmentCard: {
    backgroundColor: "#fbfdf0",
    borderColor: "#e1eb8b",
  },
  attachmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  attachmentDate: {
    fontSize: 12,
    color: "#6d7882",
  },
  attachmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attachmentItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#edf2f5",
    backgroundColor: "#ffffff",
    padding: 10,
    gap: 4,
  },
  attachmentLabel: {
    fontSize: 11,
    color: "#7d8892",
  },
  attachmentValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2a33",
  },
  composerSection: {
    gap: 10,
  },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#edf2f5",
    backgroundColor: "#f9fbfc",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachCopy: {
    flex: 1,
    gap: 2,
  },
  attachTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  attachDescription: {
    fontSize: 14,
    color: "#6d7882",
  },
  attachToggle: {
    minWidth: 84,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d9e18a",
    backgroundColor: "#f2f5cf",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  attachToggleOn: {
    backgroundColor: "#eff4c3",
  },
  attachToggleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334100",
  },
  attachToggleTextOn: {
    color: "#263200",
  },
  previewCard: {
    borderWidth: 1,
    borderColor: "#edf2f5",
    backgroundColor: "#fbfcfd",
    padding: 12,
    gap: 10,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  previewMeta: {
    fontSize: 12,
    color: "#6d7882",
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#edf2f5",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: "#7d8892",
  },
  previewValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  inputWrap: {
    minHeight: 124,
    borderWidth: 1,
    borderColor: "#edf2f5",
    backgroundColor: "#ffffff",
    paddingTop: 14,
    paddingLeft: 14,
    paddingRight: 100,
    paddingBottom: 54,
    position: "relative",
  },
  input: {
    minHeight: 54,
    fontSize: 16,
    lineHeight: 24,
    color: "#1f2a33",
  },
  sendButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    minWidth: 88,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#cdde00",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2a33",
  },
  composerCaption: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6d7882",
  },
});
