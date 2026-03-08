import { StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function TagPill({ label, tone = "neutral" }) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={[styles.label, tone === "neutral" ? styles.neutralLabel : null]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  neutral: {
    backgroundColor: palette.surfaceMuted,
  },
  official: {
    backgroundColor: palette.info,
  },
  caution: {
    backgroundColor: palette.warningSoft,
  },
  civic: {
    backgroundColor: palette.successSoft,
  },
  danger: {
    backgroundColor: palette.dangerSoft,
  },
  label: {
    color: palette.ink,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  neutralLabel: {
    color: palette.inkMuted,
  },
});
