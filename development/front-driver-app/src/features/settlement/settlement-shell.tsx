import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatClock(now = new Date()): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function SettlementShell({
  title,
  headerTools,
  description,
  children,
}: PropsWithChildren<{
  title: string;
  headerTools: string;
  description: string;
}>) {
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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.headerTools}>{headerTools}</Text>
          </View>
          <Text style={styles.description}>{description}</Text>

          {children}
        </View>
      </View>
    </SafeAreaView>
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
});
