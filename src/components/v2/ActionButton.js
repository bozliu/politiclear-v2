import { Pressable, StyleSheet, Text } from "react-native";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function ActionButton({
  label,
  onPress,
  tone = "primary",
  compact = false,
  accessibilityLabel,
  disabled = false,
  fullWidth = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel || label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[tone],
        compact && styles.compact,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          tone === "secondary" && styles.secondaryLabel,
          disabled && tone !== "secondary" && styles.disabledLabel,
          disabled && tone === "secondary" && styles.secondaryDisabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  fullWidth: {
    width: "100%",
  },
  primary: {
    backgroundColor: palette.civic,
  },
  accent: {
    backgroundColor: palette.accent,
  },
  secondary: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.56,
    shadowOpacity: 0,
  },
  label: {
    color: "#ffffff",
    fontSize: typography.body,
    fontWeight: "700",
  },
  secondaryLabel: {
    color: palette.ink,
  },
  secondaryDisabledLabel: {
    color: palette.inkMuted,
  },
  disabledLabel: {
    color: "rgba(255,255,255,0.86)",
  },
});
