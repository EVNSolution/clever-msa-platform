import { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description: string;
  scrollable?: boolean;
  keyboardAware?: boolean;
}>;

export function ScreenShell({
  children,
  eyebrow,
  title,
  description,
  scrollable = false,
  keyboardAware = false,
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (scrollable) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              {
                paddingBottom: Math.max(insets.bottom + 48, 96),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
            {content}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f0",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 10,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "600",
    color: "#65724d",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#181818",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4f4f46",
  },
  content: {
    flex: 1,
    marginTop: 14,
  },
});
