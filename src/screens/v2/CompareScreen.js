import { StyleSheet, Text, View } from "react-native";
import CompareMatrix from "../../components/v2/CompareMatrix";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import ActionButton from "../../components/v2/ActionButton";
import CandidateAvatar from "../../components/v2/CandidateAvatar";
import TagPill from "../../components/v2/TagPill";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { palette, spacing, typography } from "../../theme/tokens";

export default function CompareScreen({ navigation }) {
  const {
    clearCompareCandidates,
    compareCandidateIds,
    compareLimit,
    canAddCompareCandidate,
    getCandidatesForConstituency,
    getCompareCandidates,
    getElectionCandidatesForConstituency,
    reportExternalLinkError,
    selectedConstituency,
    toggleCompareCandidate,
  } = usePoliticlear();

  const compareSet = getCompareCandidates(compareCandidateIds);
  const localCandidates = [
    ...getCandidatesForConstituency(selectedConstituency.id),
    ...getElectionCandidatesForConstituency(selectedConstituency.id),
  ];

  return (
    <PageShell
      actionLabel="Back"
      onActionPress={() => navigation.goBack()}
      eyebrow="Compare"
      title={`Issue matrix for ${selectedConstituency.name}`}
      subtitle="Compare two to four local profiles row by row. Current TDs can carry issue-linked Oireachtas evidence; 2024 ballot candidates may only have official ballot-record coverage."
    >
      <SectionCard
        eyebrow="Current compare set"
        title={`${compareSet.candidates.length} profiles selected`}
        description={
          compareCandidateIds.length >= compareLimit
            ? "All compare slots are filled. Remove one selected profile before adding another."
            : "The compare view is source-linked by design. It will show official ballot-record coverage and visible unknowns instead of inventing certainty."
        }
        tone="warning"
      >
        <View style={styles.selectedRow}>
          {compareSet.candidates.map((candidate) => (
            <TagPill key={candidate.id} label={candidate.name} tone="official" />
          ))}
        </View>
        <View style={styles.actionRow}>
          <ActionButton
            compact
            label="Clear compare"
            onPress={clearCompareCandidates}
            tone="secondary"
          />
          <ActionButton
            compact
            label="Back to candidates"
            onPress={() =>
              navigation.navigate("HomeTabs", { screen: "Candidates" })
            }
            tone="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Matrix"
        title="Open evidence, not just opinions"
        description="Each row keeps issue context visible and lets you jump back to an attached source label when one exists. Missing issue evidence stays explicit."
      >
        <CompareMatrix
          compareSet={compareSet}
          onExternalLinkError={reportExternalLinkError}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Add or swap profiles"
        title="Keep the comparison local"
        description="This compare pool stays constituency-specific so your shortlist does not drift away from the ballot you will actually see."
      >
        {localCandidates.map((candidate) => (
          <View key={candidate.id} style={styles.swapRow}>
            <CandidateAvatar candidate={candidate} size={54} style={styles.swapAvatar} />
            <View style={styles.swapCopy}>
              <Text style={styles.swapTitle}>{candidate.name}</Text>
              <Text style={styles.swapMeta}>
                {candidate.party} ·{" "}
                {candidate.profileKind === "electionCandidate"
                  ? candidate.electedLabel || "2024 ballot candidate"
                  : "Current TD"}
              </Text>
            </View>
            <ActionButton
              compact
              label={
                compareCandidateIds.includes(candidate.compareKey || candidate.id)
                  ? "Remove"
                  : canAddCompareCandidate(candidate.compareKey || candidate.id)
                    ? "Add"
                    : "Compare full"
              }
              onPress={() => toggleCompareCandidate(candidate.compareKey || candidate.id)}
              tone={
                compareCandidateIds.includes(candidate.compareKey || candidate.id)
                  ? "secondary"
                  : "accent"
              }
              disabled={
                !canAddCompareCandidate(candidate.compareKey || candidate.id) &&
                !compareCandidateIds.includes(candidate.compareKey || candidate.id)
              }
            />
          </View>
        ))}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  selectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  actionRow: {
    gap: spacing.sm,
  },
  swapRow: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  swapCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  swapAvatar: {
    marginRight: spacing.sm,
  },
  swapTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 2,
  },
  swapMeta: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
  },
});
