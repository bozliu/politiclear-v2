import { Pressable, StyleSheet, Text } from "react-native";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function ActionButton({
  label,
  onPress,
  tone = "primary",
  compact = false,
  accessibilityLabel,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[tone],
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, tone === "secondary" && styles.secondaryLabel]}>
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
  primary: {
    backgroundColor: palette.civic,
  },
  secondary: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: "#ffffff",
    fontSize: typography.body,
    fontWeight: "700",
  },
  secondaryLabel: {
    color: palette.ink,
  },
});
