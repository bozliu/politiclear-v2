import { Pressable, StyleSheet, Text, View } from "react-native";
import CandidateAvatar from "../../components/v2/CandidateAvatar";
import ConstituencyBoundaryMap from "../../components/v2/ConstituencyBoundaryMap";
import ConstituencyFinderCard from "../../components/v2/ConstituencyFinderCard";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import SourceList from "../../components/v2/SourceList";
import TagPill from "../../components/v2/TagPill";
import ActionButton from "../../components/v2/ActionButton";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { palette, spacing, typography } from "../../theme/tokens";
import { openExternalUrl } from "../../utils/externalLinks";

export default function HomeDashboardScreen({ navigation }) {
  const {
    checklistSections,
    compareCandidateIds,
    constituencies,
    findConstituencies,
    getCandidatesForConstituency,
    getElectionCandidatesForConstituency,
    getFeaturedUpdates,
    lookupConstituencies,
    lookupModes,
    officialResources,
    reportExternalLinkError,
    selectedConstituency,
    selectConstituency,
    setCompareCandidates,
    toggleCompareCandidate,
  } = usePoliticlear();

  const localCandidates = getCandidatesForConstituency(selectedConstituency.id);
  const localBallotCandidates = getElectionCandidatesForConstituency(selectedConstituency.id);
  const spotlightProfiles = [
    ...localCandidates.slice(0, 2),
    ...localBallotCandidates.filter(
      (candidate) =>
        !localCandidates.some(
          (currentCandidate) =>
            (currentCandidate.compareKey || currentCandidate.id) ===
            (candidate.compareKey || candidate.id)
        )
    ).slice(0, 1),
  ];
  const featuredUpdates = getFeaturedUpdates(selectedConstituency.id, 3);
  const heroResources = officialResources.slice(0, 4);
  const curatedUpdateCount = featuredUpdates.filter((update) => update.sourceType !== "official").length;

  const openCompare = () => {
    if (compareCandidateIds.length >= 2) {
      navigation.navigate("CandidateCompare");
      return;
    }

    setCompareCandidates(
      localCandidates.slice(0, 2).map((candidate) => candidate.compareKey || candidate.id)
    );
    navigation.navigate("CandidateCompare");
  };

  return (
    <PageShell
      eyebrow="Politiclear 2.0"
      title="Evidence first civic briefings"
      subtitle="Start with your constituency, review source-linked profiles, then compare local candidates without black-box scoring."
    >
      <View style={styles.topGrid}>
        <View style={styles.topGridPrimary}>
          <ConstituencyFinderCard
            findMatches={findConstituencies}
            lookupConstituencies={lookupConstituencies}
            lookupModes={lookupModes}
            onOpenMap={() => navigation.navigate("ConstituencyExplorer")}
            onExternalLinkError={reportExternalLinkError}
            onSelectConstituency={selectConstituency}
            selectedConstituency={selectedConstituency}
            helperText="Start with constituency name, town/locality, or routing-key Eircode search, then jump into current TD profiles, checklist tasks, and verified links."
          />
        </View>
        <View style={styles.topGridSecondary}>
          <SectionCard
            eyebrow="Live map"
            title={`${selectedConstituency.name} in context`}
            description="The map is now a real boundary-based constituency explorer. Use it alongside search, not instead of search."
            tone="accent"
          >
            <ConstituencyBoundaryMap
              constituencies={constituencies}
              selectedConstituencyId={selectedConstituency.id}
              onSelectConstituency={selectConstituency}
              height={340}
            />
          </SectionCard>
        </View>
      </View>

      <SectionCard
        eyebrow="Ballot radar"
        title="Meet the local shortlist visually"
        description="These spotlight cards mix current TD evidence with ballot-only profiles, so the home screen reflects the actual local choice set."
      >
        <View style={styles.spotlightGrid}>
          {spotlightProfiles.map((candidate) => (
            <Pressable
              key={candidate.id}
              onPress={() =>
                navigation.navigate("CandidateDetail", { candidateId: candidate.id })
              }
              style={({ pressed }) => [
                styles.spotlightCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.spotlightHeader}>
                <CandidateAvatar candidate={candidate} size={108} style={styles.spotlightAvatar} />
                <View style={styles.spotlightCopy}>
                  <Text style={styles.spotlightName}>{candidate.name}</Text>
                  <Text style={styles.spotlightMeta}>
                    {candidate.party} · {candidate.constituencyName}
                  </Text>
                  <View style={styles.metricRow}>
                    <TagPill
                      label={
                        candidate.issueEvidenceCount > 0
                          ? `Issue-linked ${candidate.issueEvidenceCount}`
                          : "Profile only"
                      }
                      tone={candidate.issueEvidenceCount > 0 ? "civic" : "caution"}
                    />
                    <TagPill
                      label={`${candidate.sourceCount || candidate.sources.length} sources`}
                      tone="neutral"
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.spotlightSummary}>{candidate.summary}</Text>
              <View style={styles.issueRow}>
                {candidate.keyIssues
                  .filter((issue) => issue.coverageStatus !== "unknown")
                  .slice(0, 3)
                  .map((issue) => (
                  <TagPill key={issue.issueId} label={issue.label} tone="civic" />
                ))}
                {candidate.profileKind === "electionCandidate" &&
                !candidate.keyIssues.some((issue) => issue.coverageStatus !== "unknown") ? (
                  <TagPill label="Official ballot record" tone="official" />
                ) : null}
              </View>
              <View style={styles.spotlightActions}>
                <ActionButton
                  compact
                  label="Open profile"
                  onPress={() =>
                    navigation.navigate("CandidateDetail", { candidateId: candidate.id })
                  }
                  tone="secondary"
                />
                <ActionButton
                  compact
                  label={
                    compareCandidateIds.includes(candidate.compareKey || candidate.id)
                      ? "Remove from compare"
                      : "Add to compare"
                  }
                  onPress={() => toggleCompareCandidate(candidate.compareKey || candidate.id)}
                  tone={
                    compareCandidateIds.includes(candidate.compareKey || candidate.id)
                      ? "secondary"
                      : "primary"
                  }
                />
              </View>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="My area"
        title={selectedConstituency.name}
        description={selectedConstituency.summary}
        tone="info"
      >
        <View style={styles.metricRow}>
          <TagPill label={`${selectedConstituency.seats} seats`} tone="official" />
          <TagPill label={`Updated ${selectedConstituency.updatedAt}`} tone="neutral" />
        </View>
        <View style={styles.issueRow}>
          {selectedConstituency.localIssues.map((issue) => (
            <TagPill key={issue} label={issue} tone="civic" />
          ))}
        </View>
        <View style={styles.actionStack}>
          <ActionButton
            label="Open My Area"
            onPress={() => navigation.navigate("My Area")}
          />
          <ActionButton
            label="Compare local candidates"
            onPress={openCompare}
            tone="secondary"
          />
          <ActionButton
            compact
            label="Check the register"
            onPress={() =>
              openExternalUrl(checklistSections[0].items[0].link.url, {
                onError: reportExternalLinkError,
                sourceLabel: checklistSections[0].items[0].label,
              })
            }
            tone="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Verified next steps"
        title="Use official tools before you decide"
        description="This launch keeps the most useful authoritative links close to the top of the home dashboard."
        tone="success"
      >
        <SourceList sources={heroResources} onExternalLinkError={reportExternalLinkError} />
      </SectionCard>

      <SectionCard
        eyebrow="Local watch"
        title="Why this constituency matters right now"
        description={
          curatedUpdateCount > 0
            ? "This mix of official and reviewed curated items keeps source labels, provenance, and review state visible."
            : "This feed is currently official-only, so it reads as a civic watchlist rather than a general media wall."
        }
      >
        {featuredUpdates.map((update) => (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open update: ${update.title}`}
            key={update.id}
            onPress={() =>
              openExternalUrl(update.url, {
                onError: reportExternalLinkError,
                sourceLabel: update.sourceLabel,
              })
            }
            style={({ pressed }) => [styles.updateCard, pressed && styles.pressed]}
          >
            <View style={styles.updateHeader}>
              <Text style={styles.updateTitle}>{update.title}</Text>
              <TagPill label={update.sourceType} tone="official" />
            </View>
            <Text style={styles.updateSummary}>{update.summary}</Text>
            <View style={styles.issueRow}>
              {(update.issueTags || update.tags || []).map((tag) => (
                <TagPill key={`${update.id}-${tag}`} label={tag} tone="neutral" />
              ))}
            </View>
            <Text style={styles.updateMeta}>
              {update.sourceLabel} · {update.publishedAt}
            </Text>
            <Text style={styles.updateReason}>
              Why it matters: {update.relevanceReason || update.whyItMatters}
            </Text>
            {update.provenance ? (
              <Text style={styles.updateProvenance}>Provenance: {update.provenance}</Text>
            ) : null}
            {update.reviewState ? (
              <Text style={styles.updateProvenance}>Review state: {update.reviewState}</Text>
            ) : null}
            {update.editorialNote ? (
              <Text style={styles.updateProvenance}>Editorial note: {update.editorialNote}</Text>
            ) : null}
          </Pressable>
        ))}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  topGrid: {
    marginBottom: spacing.md,
  },
  topGridPrimary: {
    marginBottom: spacing.md,
  },
  topGridSecondary: {
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  issueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  actionStack: {
    gap: spacing.sm,
  },
  spotlightGrid: {
    marginBottom: spacing.xs,
  },
  spotlightCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  spotlightHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  spotlightAvatar: {
    marginRight: spacing.md,
  },
  spotlightCopy: {
    flex: 1,
  },
  spotlightName: {
    color: palette.ink,
    fontSize: typography.h2,
    fontWeight: "800",
    marginBottom: 4,
  },
  spotlightMeta: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  spotlightSummary: {
    color: palette.ink,
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  spotlightActions: {
    gap: spacing.sm,
  },
  updateCard: {
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  updateHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  updateTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  updateSummary: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  updateMeta: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  updateReason: {
    color: palette.ink,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  updateProvenance: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});
