import { Pressable, StyleSheet, Text, View } from "react-native";
import ActionButton from "./ActionButton";
import CandidateAvatar from "./CandidateAvatar";
import TagPill from "./TagPill";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function CandidateCard({
  candidate,
  onOpen,
  onToggleCompare,
  isCompared = false,
  compareButtonLabel,
  compareButtonDisabled = false,
  compareHelperText = null,
}) {
  const isElectionCandidate = candidate.profileKind === "electionCandidate";
  const badgeLabel =
    candidate.issueEvidenceCount > 0
      ? `Issue-linked ${candidate.issueEvidenceCount}`
      : isElectionCandidate
        ? "Ballot record"
        : "Profile only";
  const coverageTone =
    candidate.issueEvidenceCount > 0 ? "civic" : isElectionCandidate ? "official" : "caution";
  const issueTags =
    candidate.issueEvidenceCount > 0
      ? candidate.keyIssues.slice(0, 3).map((issue) => issue.label)
      : [];
  const transparencyLabels = (candidate.transparencyLabels || []).slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.visualStage}>
        <View style={styles.visualGlowPrimary} />
        <View style={styles.visualGlowAccent} />
        <View style={styles.visualTopRow}>
          <View style={styles.badgeRow}>
            <TagPill
              label={badgeLabel}
              tone={coverageTone}
            />
            {candidate.isIncumbent ? (
              <TagPill label="Current TD" tone="official" />
            ) : null}
            {isElectionCandidate ? (
              <TagPill label={candidate.electedLabel || "2024 candidate"} tone="neutral" />
            ) : null}
          </View>
          <Text style={styles.lastUpdated}>Updated {candidate.lastUpdated}</Text>
        </View>

        <View style={styles.heroRow}>
          <CandidateAvatar candidate={candidate} size={112} style={styles.avatar} />
          <View style={styles.heroCopy}>
            <View style={styles.headerRow}>
              <View style={styles.nameBlock}>
                <Text style={styles.name}>{candidate.name}</Text>
                <Text style={styles.meta}>
                  {candidate.party} · {candidate.constituencyName}
                </Text>
                <Text style={styles.coverageText}>
                  {candidate.evidenceCoverage || candidate.coverageNote || "Profile coverage pending"}
                </Text>
              </View>
            </View>
            <View style={styles.issueRow}>
              {issueTags.map((label) => (
                <TagPill key={label} label={label} tone="civic" />
              ))}
              {isElectionCandidate && candidate.firstPreferenceVotes ? (
                <TagPill
                  label={`First prefs ${candidate.firstPreferenceVotes.toLocaleString()}`}
                  tone="official"
                />
              ) : null}
              {isElectionCandidate && candidate.isOutgoingMember ? (
                <TagPill label="Outgoing member" tone="neutral" />
              ) : null}
              {transparencyLabels.map((label) => (
                <TagPill
                  key={`${candidate.id}-${label}`}
                  label={label}
                  tone={label.includes("unknown") ? "caution" : "neutral"}
                />
              ))}
              {!issueTags.length && !isElectionCandidate ? (
                <TagPill label="No verified issue rows yet" tone="caution" />
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.summary}>{candidate.summary}</Text>
      {candidate.provenanceSummary ? (
        <Text style={styles.provenance}>{candidate.provenanceSummary}</Text>
      ) : null}

      <View style={styles.evidenceRow}>
        <Text style={styles.evidenceText}>
          {candidate.sourceCount || candidate.sources.length} sources · Updated {candidate.lastUpdated}
        </Text>
      </View>

      <View style={styles.actionRow}>
        {onToggleCompare ? (
          <ActionButton
            compact
            label={compareButtonLabel || (isCompared ? "Remove from compare" : "Add to compare")}
            onPress={onToggleCompare}
            tone={isCompared ? "secondary" : "accent"}
            disabled={compareButtonDisabled}
          />
        ) : null}
        <Pressable onPress={onOpen} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
          <Text style={styles.linkLabel}>Open profile</Text>
        </Pressable>
      </View>
      {compareHelperText ? <Text style={styles.compareHelper}>{compareHelperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  visualStage: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
  },
  visualGlowPrimary: {
    backgroundColor: palette.civicSoft,
    borderRadius: 140,
    height: 160,
    position: "absolute",
    right: -30,
    top: -48,
    width: 190,
  },
  visualGlowAccent: {
    backgroundColor: palette.accentSoft,
    borderRadius: 120,
    bottom: -48,
    height: 140,
    left: -24,
    position: "absolute",
    width: 150,
  },
  visualTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
    marginRight: spacing.sm,
  },
  lastUpdated: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    marginTop: 4,
  },
  heroRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  avatar: {
    marginRight: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nameBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    color: palette.ink,
    fontSize: typography.h2,
    fontWeight: "800",
    marginBottom: 4,
  },
  meta: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  coverageText: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  summary: {
    color: palette.ink,
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  provenance: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  issueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  evidenceRow: {
    marginBottom: spacing.md,
  },
  evidenceText: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  compareHelper: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  linkButton: {
    paddingVertical: spacing.xs,
  },
  linkLabel: {
    color: palette.civicStrong,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
});
