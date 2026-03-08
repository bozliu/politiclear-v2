import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CandidateAvatar from "./CandidateAvatar";
import { palette, radii, spacing, typography } from "../../theme/tokens";
import { openExternalUrl } from "../../utils/externalLinks";

export default function CompareMatrix({ compareSet, onExternalLinkError }) {
  const { candidates = [], rows = [] } = compareSet || {};

  if (candidates.length < 2) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Pick at least two profiles to compare</Text>
        <Text style={styles.emptyBody}>
          Politiclear only shows source-linked comparison rows. It will not guess the rest.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.matrixShell}>
        <View style={styles.headerRow}>
          <View style={styles.issueHeaderCell}>
            <Text style={styles.issueHeaderLabel}>Issue</Text>
          </View>
          {candidates.map((candidate) => (
            <View key={candidate.id} style={styles.candidateHeaderCell}>
              <View style={styles.candidateHeaderTop}>
                <CandidateAvatar candidate={candidate} size={64} style={styles.headerAvatar} />
                <View style={styles.headerCopy}>
                  <Text style={styles.candidateName}>{candidate.name}</Text>
                  <Text style={styles.candidateMeta}>{candidate.party}</Text>
                </View>
              </View>
              <Text style={styles.headerCoverage}>
                {candidate.evidenceCoverage ||
                  (candidate.issueEvidenceCount > 0
                    ? `Issue-linked coverage on ${candidate.issueEvidenceCount} topics`
                    : candidate.profileKind === "electionCandidate"
                      ? "Official ballot record only"
                      : "Profile evidence only")}
              </Text>
            </View>
          ))}
        </View>
        {rows.map((row) => (
          <View key={row.issueId} style={styles.bodyRow}>
            <View style={styles.issueCell}>
              <Text style={styles.issueTitle}>{row.label}</Text>
              <Text style={styles.issuePrompt}>{row.prompt}</Text>
            </View>
            {row.cells.map((cell) => (
              <View key={`${row.issueId}-${cell.candidateId}`} style={styles.compareCell}>
                <Text
                  style={[
                    styles.coverageLabel,
                    cell.coverageLabel === "Linked evidence"
                      ? styles.coverageLinked
                      : cell.coverageLabel === "Party source"
                        ? styles.coverageParty
                        : styles.coverageUnknown,
                  ]}
                >
                  {cell.coverageLabel}
                </Text>
                <Text style={styles.cellStance}>{cell.stance}</Text>
                <Text style={styles.cellSummary}>{cell.summary}</Text>
                {cell.source?.sourceType || cell.source?.type || cell.source?.confidence ? (
                  <Text style={styles.sourceMeta}>
                    {[
                      cell.source?.sourceType || cell.source?.type,
                      cell.source?.confidence ? `${cell.source.confidence} confidence` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
                {cell.source ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Open evidence source: ${cell.evidenceLabel}`}
                    onPress={() =>
                      openExternalUrl(cell.source.url, {
                        onError: onExternalLinkError,
                        sourceLabel: cell.evidenceLabel,
                      })
                    }
                    style={({ pressed }) => [styles.sourceChip, pressed && styles.pressed]}
                  >
                    <Text style={styles.sourceChipText}>{cell.evidenceLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  emptyBody: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: "row",
  },
  matrixShell: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  issueHeaderCell: {
    backgroundColor: palette.civicStrong,
    borderTopLeftRadius: radii.lg,
    minHeight: 96,
    padding: spacing.md,
    width: 170,
  },
  issueHeaderLabel: {
    color: "#ffffff",
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  candidateHeaderCell: {
    backgroundColor: palette.civic,
    borderLeftColor: palette.background,
    borderLeftWidth: 1,
    minHeight: 112,
    padding: spacing.md,
    width: 250,
  },
  candidateHeaderTop: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  headerAvatar: {
    marginRight: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  candidateName: {
    color: "#ffffff",
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 4,
  },
  candidateMeta: {
    color: "#ffffff",
    fontSize: typography.caption,
  },
  headerCoverage: {
    color: "rgba(255,255,255,0.76)",
    fontSize: typography.caption,
    lineHeight: 18,
  },
  bodyRow: {
    flexDirection: "row",
  },
  issueCell: {
    backgroundColor: palette.surfaceMuted,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    borderRightColor: palette.border,
    borderRightWidth: 1,
    padding: spacing.md,
    width: 170,
  },
  issueTitle: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  issuePrompt: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  compareCell: {
    backgroundColor: palette.surface,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    borderRightColor: palette.border,
    borderRightWidth: 1,
    padding: spacing.md,
    width: 250,
  },
  coverageLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  coverageLinked: {
    color: palette.civicStrong,
  },
  coverageParty: {
    color: palette.info,
  },
  coverageUnknown: {
    color: palette.accent,
  },
  cellStance: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  cellSummary: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  sourceMeta: {
    color: palette.inkMuted,
    fontSize: 10,
    lineHeight: 14,
    marginBottom: spacing.sm,
    textTransform: "capitalize",
  },
  sourceChip: {
    alignSelf: "flex-start",
    backgroundColor: palette.info,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  sourceChipText: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
});
