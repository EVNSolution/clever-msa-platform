import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type AuthTextFieldProps = {
  value: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

type AuthCheckboxRowProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
  error?: string;
};

type AuthAgreementRowProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
  onPressDetail?: () => void;
  error?: string;
};

type AuthButtonProps = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  tone?: "primary" | "secondary";
};

export function AuthTextField({
  value,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  onChangeText,
  onBlur,
  error,
}: AuthTextFieldProps) {
  return (
    <View style={styles.fieldStack}>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#78716c"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onChangeText={onChangeText}
        onBlur={onBlur}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function AuthCheckboxRow({
  checked,
  label,
  onPress,
  error,
}: AuthCheckboxRowProps) {
  return (
    <View style={styles.fieldStack}>
      <Pressable onPress={onPress} style={styles.checkboxRow}>
        <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
          {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function AuthAgreementRow({
  checked,
  label,
  onPress,
  onPressDetail,
  error,
}: AuthAgreementRowProps) {
  return (
    <View style={styles.fieldStack}>
      <View style={styles.agreementRow}>
        <Pressable onPress={onPress} style={styles.agreementMain}>
          <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
            {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </View>
          <Text style={styles.agreementLabel}>{label}</Text>
        </Pressable>
        <Pressable onPress={onPressDetail ?? onPress}>
          <Text style={styles.agreementDetail}>자세히보기</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function AuthButton({
  label,
  disabled,
  onPress,
  tone = "primary",
}: AuthButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        tone === "primary" ? styles.primaryButton : styles.secondaryButton,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === "primary" ? styles.primaryButtonText : styles.secondaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AuthMessage({
  text,
  tone,
}: {
  text: string;
  tone: "error" | "success" | "muted";
}) {
  return (
    <View
      style={[
        styles.messageBox,
        tone === "error" ? styles.errorBox : null,
        tone === "success" ? styles.successBox : null,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          tone === "error" ? styles.errorMessageText : null,
          tone === "success" ? styles.successMessageText : null,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldStack: {
    gap: 6,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d6d3d1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: "#181818",
  },
  inputError: {
    borderColor: "#d14343",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfb8ae",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkboxChecked: {
    backgroundColor: "#cddc39",
    borderColor: "#cddc39",
  },
  checkboxMark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#181818",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#3f3f46",
  },
  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  agreementMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  agreementLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#2d3748",
  },
  agreementDetail: {
    fontSize: 13,
    color: "#6d7882",
  },
  button: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#cddc39",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6d3d1",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: "#181818",
  },
  secondaryButtonText: {
    color: "#181818",
  },
  errorText: {
    fontSize: 13,
    color: "#b42318",
  },
  messageBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ece7df",
  },
  errorBox: {
    backgroundColor: "#fef3f2",
  },
  successBox: {
    backgroundColor: "#ecfdf3",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#57534e",
  },
  errorMessageText: {
    color: "#b42318",
  },
  successMessageText: {
    color: "#067647",
  },
});
