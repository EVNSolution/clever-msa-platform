import { router } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@/features/auth/auth-api";
import { useAuthSession } from "@/features/auth/auth-session";
import { getTemporarySettlementOverlayForMonth } from "@/features/settlement/settlement-model";

import { fetchWorkLogs } from "./work-logs-api";
import {
  buildDefaultWorkLogsRange,
  buildWorkLogsMonthView,
  normalizeWorkLogsResponse,
  shouldBlockWorkLogs,
  type WorkLogsMonthCell,
  type WorkLogsMonthView,
  type WorkLogsResult,
} from "./work-logs-model";

function formatClock(now = new Date()): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

function SummaryStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryCardLabel}>{label}</Text>
      <Text style={styles.summaryCardValue}>{value}</Text>
    </View>
  );
}

function WorkLogGridCell({ cell }: { cell: WorkLogsMonthCell }) {
  const cellStyles = [
    styles.cell,
    !cell.isCurrentMonth ? styles.cellMuted : null,
    cell.isEmpty ? styles.cellEmpty : null,
    cell.isToday && cell.isCurrentMonth ? styles.cellToday : null,
    cell.isSelected ? styles.cellSelected : null,
  ];

  const markerStyles = [
    styles.marker,
    cell.markerTone === "regular"
      ? styles.regularMarker
      : cell.markerTone === "special"
        ? styles.specialMarker
        : styles.hiddenMarker,
  ];

  return (
    <View style={cellStyles}>
      <View style={styles.cellTop}>
        <Text style={[styles.dayNumber, cell.isEmpty ? styles.emptyCellText : null]}>
          {cell.dayNumber}
        </Text>
        <View style={markerStyles} />
      </View>
      <View style={styles.cellValues}>
        <Text style={[styles.cellPrimary, cell.isEmpty ? styles.emptyCellText : null]}>
          {cell.primaryText}
        </Text>
        <Text style={[styles.cellSecondary, cell.isEmpty ? styles.emptyCellText : null]}>
          {cell.secondaryText}
        </Text>
      </View>
      {cell.isSelected ? <Text style={styles.selectedChip}>선택</Text> : null}
    </View>
  );
}

function MonthGrid({ view }: { view: WorkLogsMonthView }) {
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
          <View style={[styles.legendDot, styles.regularLegendDot]} />
          <Text style={styles.legendText}>일반</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.specialLegendDot]} />
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
              <WorkLogGridCell key={cell.date} cell={cell} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function ErrorStateCard({
  errorMessage,
  onRetry,
}: {
  errorMessage: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>조회에 실패했습니다</Text>
      <Text style={styles.stateText}>{errorMessage}</Text>
      <View style={styles.stateMetaRow}>
        <View style={styles.stateMetaCard}>
          <Text style={styles.stateMetaLabel}>오류 코드</Text>
          <Text style={styles.stateMetaValue}>READ_FAIL</Text>
        </View>
        <View style={styles.stateMetaCard}>
          <Text style={styles.stateMetaLabel}>최근 시도</Text>
          <Text style={styles.stateMetaValue}>{formatClock()}</Text>
        </View>
      </View>
      <Pressable style={[styles.cardActionButton, styles.cardActionButtonStrong]} onPress={onRetry}>
        <Text style={styles.cardActionButtonText}>새로고침</Text>
      </Pressable>
    </View>
  );
}

function LinkRequiredStateCard() {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>배송원 연동이 필요합니다</Text>
      <Text style={styles.stateText}>
        계정은 정상 로그인 상태지만, 아직 배송원 레코드와 연결되지 않았습니다. 관리자 연결 후
        업무기록과 정산 문의를 사용할 수 있습니다.
      </Text>
      <View style={styles.stateMetaRow}>
        <View style={styles.stateMetaCard}>
          <Text style={styles.stateMetaLabel}>상태</Text>
          <Text style={styles.stateMetaValue}>미연동</Text>
        </View>
        <View style={styles.stateMetaCard}>
          <Text style={styles.stateMetaLabel}>문의</Text>
          <Text style={styles.stateMetaValue}>가능</Text>
        </View>
      </View>
      <Pressable style={[styles.cardActionButton, styles.cardActionButtonStrong]}>
        <Text style={styles.cardActionButtonText}>계정 연동 요청</Text>
      </Pressable>
    </View>
  );
}

function EmptyStateCard() {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>업로드된 기록이 없습니다</Text>
      <Text style={styles.stateText}>
        선택한 월에 업로드된 배송원 근태 또는 배송 기록이 아직 없습니다.
      </Text>
    </View>
  );
}

function WorkLogsScaffold({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerFrame}>
        <View style={styles.screen}>
          <View style={styles.topBar}>
            <Text style={styles.topBarText}>{formatClock()}</Text>
            <View style={styles.tenantChip}>
              <Text style={styles.tenantChipText}>CHEONHA</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>DRIVER SELF-SERVICE</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>업무기록</Text>
            <Text style={styles.headerTools}>monthly</Text>
          </View>
          <Text style={styles.description}>
            웹 업로드 기준의 근태와 배송 기록만 읽기 전용으로 확인합니다.
          </Text>

          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

export function WorkLogsScreen() {
  const { session, isBootstrapping } = useAuthSession();
  const [result, setResult] = useState<WorkLogsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.activeAccountType === "system_admin") {
      router.replace("/admin");
      return;
    }

    if (session.activeAccountType !== "driver") {
      router.replace("/login");
      return;
    }

    const currentSession = session;
    let cancelled = false;

    async function loadWorkLogs() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const payload = await fetchWorkLogs(
          currentSession.accessToken,
          buildDefaultWorkLogsRange(),
        );

        if (!cancelled) {
          setResult(normalizeWorkLogsResponse(payload));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkLogs();

    return () => {
      cancelled = true;
    };
  }, [isBootstrapping, reloadNonce, session]);

  const provisionalMonthView = result ? buildWorkLogsMonthView(result) : null;
  const settlementOverlay = provisionalMonthView
    ? getTemporarySettlementOverlayForMonth(provisionalMonthView.monthLabel)
    : undefined;
  const monthView = result ? buildWorkLogsMonthView(result, { settlementOverlay }) : null;
  const workLogsBlocked = result ? shouldBlockWorkLogs(result) : false;

  return (
    <WorkLogsScaffold>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#6f7785" />
          <Text style={styles.loadingText}>업무기록을 불러오는 중입니다.</Text>
        </View>
      ) : errorMessage ? (
        <ErrorStateCard
          errorMessage={errorMessage}
          onRetry={() => {
            setResult(null);
            setErrorMessage(null);
            setIsLoading(true);
            setReloadNonce((value) => value + 1);
          }}
        />
      ) : workLogsBlocked ? (
        <LinkRequiredStateCard />
      ) : result && monthView ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MonthGrid view={monthView} />

          <Text style={styles.caption}>월간 기준으로 박스 수와 금월 실적을 함께 확인합니다.</Text>

          <View style={styles.summaryDock}>
            <Text style={styles.summaryDockTitle}>금월 실적</Text>
            <View style={styles.summaryStatsRow}>
              {monthView.summaryCards.map((card) => (
                <SummaryStatCard key={card.label} label={card.label} value={card.value} />
              ))}
            </View>
          </View>

          <Pressable
            style={styles.bottomAction}
            onPress={() => {
              router.push("/settlement/date-picker" as never);
            }}
          >
            <Text style={styles.bottomActionText}>정산 문의하기</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <EmptyStateCard />
      )}
    </WorkLogsScaffold>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  outerFrame: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(223, 230, 235, 0.24)",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  topBarText: {
    fontSize: 11,
    color: "#8c98a1",
    letterSpacing: 0.4,
  },
  tenantChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#cdde00",
  },
  tenantChipText: {
    color: "#223100",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  eyebrow: {
    marginBottom: 6,
    color: "#8c98a1",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1f2a33",
    letterSpacing: -1.2,
  },
  headerTools: {
    fontSize: 14,
    color: "#6d7882",
  },
  description: {
    marginTop: 8,
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 20,
    color: "#6d7882",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6d7882",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
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
  regularLegendDot: {
    backgroundColor: "#2ddc88",
    shadowColor: "#2ddc88",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  specialLegendDot: {
    backgroundColor: "#ffab3d",
    shadowColor: "#ffab3d",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
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
    borderColor: "rgba(224, 231, 236, 0.58)",
  },
  gridRow: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    minHeight: 78,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 3,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(224, 231, 236, 0.58)",
    backgroundColor: "transparent",
  },
  cellMuted: {
    opacity: 0.36,
  },
  cellEmpty: {
    backgroundColor: "#535d67",
  },
  cellToday: {
    backgroundColor: "rgba(205, 222, 0, 0.08)",
  },
  cellSelected: {
    backgroundColor: "rgba(205, 222, 0, 0.18)",
    borderColor: "rgba(179, 202, 54, 0.78)",
    borderWidth: 1,
  },
  cellTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2a33",
  },
  marker: {
    width: 4,
    height: 4,
    borderRadius: 999,
    marginTop: 1,
  },
  regularMarker: {
    backgroundColor: "#2ddc88",
    shadowColor: "#2ddc88",
    shadowOpacity: 0.95,
    shadowRadius: 4,
    elevation: 4,
  },
  specialMarker: {
    backgroundColor: "#ffab3d",
    shadowColor: "#ffab3d",
    shadowOpacity: 0.95,
    shadowRadius: 4,
    elevation: 4,
  },
  hiddenMarker: {
    backgroundColor: "transparent",
  },
  cellValues: {
    gap: 2,
  },
  cellPrimary: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1f2a33",
  },
  cellSecondary: {
    fontSize: 11,
    color: "#22313b",
  },
  emptyCellText: {
    color: "#edf2f6",
  },
  selectedChip: {
    marginTop: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.74)",
    fontSize: 8,
    color: "#53610c",
  },
  caption: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: "#6d7882",
  },
  summaryDock: {
    marginTop: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(224, 231, 236, 0.58)",
    backgroundColor: "#f8fafb",
  },
  summaryDockTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  summaryStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(224, 231, 236, 0.58)",
    backgroundColor: "#ffffff",
    gap: 6,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: "#6d7882",
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2a33",
  },
  bottomAction: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(224, 231, 236, 0.58)",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  bottomActionText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  stateCard: {
    marginTop: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(224, 231, 236, 0.58)",
    backgroundColor: "#f8fafb",
    gap: 12,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2a33",
    letterSpacing: -0.6,
  },
  stateText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#5c6670",
  },
  stateMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  stateMetaCard: {
    flex: 1,
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(224, 231, 236, 0.58)",
    backgroundColor: "#ffffff",
    gap: 6,
  },
  stateMetaLabel: {
    fontSize: 12,
    color: "#6d7882",
  },
  stateMetaValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a33",
  },
  cardActionButton: {
    marginTop: 4,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  cardActionButtonStrong: {
    backgroundColor: "#cdde00",
  },
  cardActionButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#223100",
  },
});
