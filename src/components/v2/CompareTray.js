import { StyleSheet, Text, View } from "react-native";
import CandidateAvatar from "./CandidateAvatar";
import ActionButton from "./ActionButton";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function CompareTray({
  candidates = [],
  compareLimit = 4,
  onOpenCompare,
  onRemoveCandidate,
}) {
  if (!candidates.length) {
    return null;
  }

  const selectedCount = candidates.length;
  const remainingCount = Math.max(compareLimit - selectedCount, 0);
  const compareReady = selectedCount >= 2;
  const helperText = compareReady
    ? "Open the side-by-side compare view and scan issue coverage, sourcing, and profile differences in one place."
    : `Select ${remainingCount} more profile${remainingCount === 1 ? "" : "s"} to compare.`;
  const ctaLabel = compareReady
    ? `Compare ${selectedCount} selected profiles`
    : `Select ${remainingCount} more to compare`;

  return (
    <View style={styles.shell}>
      <View style={styles.glowPrimary} />
      <View style={styles.glowAccent} />
      <View style={styles.topRow}>
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>Compare profiles</Text>
          <Text style={styles.title}>
            {compareReady ? "Your shortlist is ready" : "Keep building your shortlist"}
          </Text>
          <Text style={styles.helper}>{helperText}</Text>
        </View>
        <View style={styles.counterBadge}>
          <Text style={styles.counterValue}>
            {selectedCount}/{compareLimit}
          </Text>
          <Text style={styles.counterLabel}>selected</Text>
        </View>
      </View>
      <ActionButton
        label={ctaLabel}
        onPress={onOpenCompare}
        disabled={!compareReady}
        fullWidth
        tone={compareReady ? "accent" : "secondary"}
        accessibilityLabel={ctaLabel}
      />
      <Text style={styles.selectionLabel}>Selected profiles</Text>
      <View style={styles.selectionRow}>
        {candidates.map((candidate) => (
          <View key={candidate.id} style={styles.selectionCard}>
            <CandidateAvatar candidate={candidate} size={46} style={styles.avatar} />
            <View style={styles.selectionCopy}>
              <Text numberOfLines={1} style={styles.selectionName}>
                {candidate.name}
              </Text>
              <Text numberOfLines={1} style={styles.selectionMeta}>
                {candidate.party}
              </Text>
            </View>
            <ActionButton
              compact
              label="Remove"
              onPress={() => onRemoveCandidate(candidate.compareKey || candidate.id)}
              tone="secondary"
              accessibilityLabel={`Remove ${candidate.name} from compare`}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: palette.civicStrong,
    borderColor: "rgba(213,178,108,0.52)",
    borderRadius: radii.xl,
    borderWidth: 2,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  glowPrimary: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 200,
    height: 180,
    position: "absolute",
    right: -40,
    top: -80,
    width: 200,
  },
  glowAccent: {
    backgroundColor: "rgba(201,106,66,0.22)",
    borderRadius: 160,
    bottom: -100,
    height: 180,
    left: -30,
    position: "absolute",
    width: 200,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  copyBlock: {
    flex: 1,
    marginRight: spacing.md,
    maxWidth: 760,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.78)",
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: typography.h3,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  helper: {
    color: "rgba(255,255,255,0.82)",
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  counterBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.lg,
    borderWidth: 1,
    minWidth: 84,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  counterValue: {
    color: "#ffffff",
    fontSize: typography.h2,
    fontWeight: "800",
    lineHeight: 28,
  },
  counterLabel: {
    color: "rgba(255,255,255,0.74)",
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  selectionLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: "uppercase",
  },
  selectionRow: {
    gap: spacing.sm,
  },
  selectionCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.sm,
  },
  avatar: {
    marginRight: spacing.sm,
  },
  selectionCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  selectionName: {
    color: "#ffffff",
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: 2,
  },
  selectionMeta: {
    color: "rgba(255,255,255,0.72)",
    fontSize: typography.caption,
  },
});
