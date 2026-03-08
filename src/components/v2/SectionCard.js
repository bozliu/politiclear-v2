import { StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function SectionCard({
  title,
  eyebrow,
  description,
  children,
  tone = "surface",
}) {
  return (
    <View style={[styles.card, styles[tone]]}>
      {(eyebrow || title || description) && (
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  surface: {
    backgroundColor: palette.surfaceRaised,
  },
  info: {
    backgroundColor: palette.info,
  },
  accent: {
    backgroundColor: palette.accentSoft,
  },
  success: {
    backgroundColor: palette.successSoft,
  },
  warning: {
    backgroundColor: palette.warningSoft,
  },
  header: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: palette.civic,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  title: {
    color: palette.ink,
    fontSize: typography.h2,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  description: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
});
