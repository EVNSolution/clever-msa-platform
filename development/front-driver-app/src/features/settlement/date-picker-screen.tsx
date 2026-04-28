import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import {
  buildWorkLogsMonthView,
  type WorkLogsMonthCell,
  type WorkLogsMonthView,
} from "@/features/driver/work-logs-model";

import {
  buildSettlementPreview,
  buildTemporarySettlementCalendarResult,
  getDefaultSettlementDateForMonth,
  getTemporarySettlementMonthLabels,
  getTemporarySettlementOverlayForMonth,
  getTemporarySettlementRecord,
} from "./settlement-model";
import { SettlementShell } from "./settlement-shell";

function buildFocusDate(monthLabel: string): string {
  const [year, month] = monthLabel.split(".");
  return `${year}-${month}-01`;
}

function SettlementCalendarCell({ cell, onPress }: { cell: WorkLogsMonthCell; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        !cell.isCurrentMonth ? styles.cellMuted : null,
        cell.isEmpty ? styles.cellEmpty : null,
        cell.isSelected ? styles.cellSelected : null,
      ]}
    >
      <View style={styles.cellTop}>
        <Text style={[styles.dayNumber, cell.isEmpty ? styles.emptyText : null]}>{cell.dayNumber}</Text>
        {cell.markerTone !== "none" ? (
          <View
            style={[
              styles.marker,
              cell.markerTone === "regular" ? styles.regularMarker : styles.specialMarker,
            ]}
          />
        ) : null}
      </View>
      <View style={styles.cellBody}>
        <Text style={[styles.cellPrimary, cell.isEmpty ? styles.emptyText : null]}>{cell.primaryText}</Text>
        <Text style={[styles.cellSecondary, cell.isEmpty ? styles.emptyText : null]}>{cell.secondaryText}</Text>
      </View>
      {cell.isSelected ? <Text style={styles.selectedText}>선택</Text> : null}
    </Pressable>
  );
}

function SettlementMonthGrid({
  view,
  onSelectDate,
}: {
  view: WorkLogsMonthView;
  onSelectDate: (date: string) => void;
}) {
  return (
    <View style={styles.monthSection}>
      <View style={styles.monthSelector}>
        <Pressable style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthValue}>{view.monthLabel}</Text>
        <Pressable style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.regularMarker]} />
          <Text style={styles.legendText}>일반</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.specialMarker]} />
          <Text style={styles.legendText}>특근</Text>
        </View>
      </View>

      <View style={styles.weekdaysRow}>
        {view.weekdays.map((weekday) => (
          <Text key={weekday} style={styles.weekdayText}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {view.weeks.map((week, index) => (
          <View key={`week-${index}`} style={styles.gridRow}>
            {week.map((cell) => (
              <SettlementCalendarCell
                key={cell.date}
                cell={cell}
                onPress={() => {
                  if (!cell.isEmpty && cell.isCurrentMonth) {
                    onSelectDate(cell.date);
                  }
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function SettlementDatePickerScreen() {
  const { session, isBootstrapping } = useAuthSession();
  const [monthIndex] = useState(0);
  const monthLabels = useMemo(() => getTemporarySettlementMonthLabels(), []);
  const monthLabel = monthLabels[monthIndex] ?? "2026.04";
  const [selectedDate, setSelectedDate] = useState<string | null>(getDefaultSettlementDateForMonth(monthLabel));

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }
    if (!session || session.activeAccountType !== "driver") {
      router.replace("/login");
    }
  }, [isBootstrapping, session]);

  useEffect(() => {
    setSelectedDate(getDefaultSettlementDateForMonth(monthLabel));
  }, [monthLabel]);

  const overlay = getTemporarySettlementOverlayForMonth(monthLabel);
  const monthView = buildWorkLogsMonthView(buildTemporarySettlementCalendarResult(monthLabel), {
    focusDate: buildFocusDate(monthLabel),
    selectedDate: selectedDate ?? undefined,
    settlementOverlay: overlay,
  });
  const selectedRecord = selectedDate ? getTemporarySettlementRecord(selectedDate, monthLabel) : null;
  const selectedPreview = selectedRecord ? buildSettlementPreview(selectedRecord) : null;

  return (
    <SettlementShell
      title="날짜 선택"
      headerTools="settlement"
      description="정산이 있는 날짜만 밝게 보입니다. 문의할 기준일 하나만 선택합니다."
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SettlementMonthGrid view={monthView} onSelectDate={setSelectedDate} />

        {selectedPreview ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>선택 날짜 요약 - {selectedPreview.dateText}</Text>
              <Text style={styles.summaryMeta}>문의 미리보기로 전달</Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>정산 타입</Text>
                <Text style={styles.summaryValue}>{selectedPreview.settlementTypeText}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>박스 수</Text>
                <Text style={styles.summaryValue}>{selectedPreview.boxCountText}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>박스당 단가</Text>
                <Text style={styles.summaryValue}>{selectedPreview.unitPriceText}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>총 정산액</Text>
                <Text style={styles.summaryValue}>{selectedPreview.totalAmountText}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <Pressable
          disabled={!selectedDate}
          style={[styles.bottomAction, !selectedDate ? styles.bottomActionDisabled : null]}
          onPress={() => {
            if (!selectedDate) {
              return;
            }
            router.push(`/settlement/chat?serviceDate=${selectedDate}` as never);
          }}
        >
          <Text style={styles.bottomActionText}>이 날짜로 적용</Text>
        </Pressable>
      </ScrollView>
    </SettlementShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    paddingBottom: 18,
  },
  monthSection: {
    gap: 8,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(248, 250, 251, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(233, 238, 242, 0.2)",
  },
  monthArrow: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  monthArrowText: {
    fontSize: 18,
    color: "#6d7882",
    marginTop: -2,
  },
  monthValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2a33",
    letterSpacing: -0.6,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 11,
    color: "#6d7882",
  },
  weekdaysRow: {
    flexDirection: "row",
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    color: "#8c98a1",
    letterSpacing: 0.8,
    paddingBottom: 4,
  },
  grid: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 227, 232, 0.55)",
  },
  gridRow: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    minHeight: 86,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 227, 232, 0.55)",
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 5,
    backgroundColor: "#ffffff",
  },
  cellMuted: {
    backgroundColor: "#c8ced4",
  },
  cellEmpty: {
    backgroundColor: "#5e6974",
  },
  cellSelected: {
    backgroundColor: "#f5f7d4",
    borderColor: "rgba(188, 205, 74, 0.82)",
    borderWidth: 1,
  },
  cellTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2a33",
  },
  marker: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  regularMarker: {
    backgroundColor: "#2ddc88",
    shadowColor: "#2ddc88",
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  specialMarker: {
    backgroundColor: "#ffab3d",
    shadowColor: "#ffab3d",
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  cellBody: {
    marginTop: 10,
    gap: 2,
  },
  cellPrimary: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1f2a33",
  },
  cellSecondary: {
    fontSize: 10,
    fontWeight: "700",
    color: "#253648",
  },
  selectedText: {
    marginTop: "auto",
    alignSelf: "flex-end",
    fontSize: 9,
    color: "#647341",
  },
  emptyText: {
    color: "#e9edf0",
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "rgba(229, 234, 239, 0.9)",
    backgroundColor: "#f9fbfc",
    padding: 12,
    gap: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2a33",
  },
  summaryMeta: {
    fontSize: 12,
    color: "#6d7882",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: "rgba(232, 237, 241, 0.9)",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#798692",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  bottomAction: {
    borderRadius: 999,
    backgroundColor: "#cdde00",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomActionDisabled: {
    opacity: 0.5,
  },
  bottomActionText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2a33",
  },
});
