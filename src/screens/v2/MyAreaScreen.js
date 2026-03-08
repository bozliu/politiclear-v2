import { Pressable, StyleSheet, Text, View } from "react-native";
import CandidateCard from "../../components/v2/CandidateCard";
import CompareTray from "../../components/v2/CompareTray";
import ConstituencyBoundaryMap from "../../components/v2/ConstituencyBoundaryMap";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import SourceList from "../../components/v2/SourceList";
import TagPill from "../../components/v2/TagPill";
import ActionButton from "../../components/v2/ActionButton";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { spacing, typography, palette } from "../../theme/tokens";
import { openExternalUrl } from "../../utils/externalLinks";

export default function MyAreaScreen({ navigation }) {
  const {
    checklistSections,
    compareCandidateIds,
    compareCandidates,
    compareLimit,
    canAddCompareCandidate,
    constituencies,
    getCandidatesForConstituency,
    getElectionCandidatesForConstituency,
    getNewsFeed,
    reportExternalLinkError,
    selectedConstituency,
    selectConstituency,
    toggleCompareCandidate,
  } = usePoliticlear();

  const candidates = getCandidatesForConstituency(selectedConstituency.id);
  const electionCandidates = getElectionCandidatesForConstituency(selectedConstituency.id);
  const localUpdates = getNewsFeed(selectedConstituency.id).slice(0, 4);
  const curatedLocalUpdates = localUpdates.filter((update) => update.sourceType !== "official").length;

  return (
    <PageShell
      eyebrow="My area"
      title={selectedConstituency.name}
      subtitle="Turn your constituency into a working shortlist: local issues, representative profiles, official tools, and practical voting tasks."
      stickyFooter={
        <CompareTray
          candidates={compareCandidates}
          compareLimit={compareLimit}
          onOpenCompare={() => navigation.navigate("CandidateCompare")}
          onRemoveCandidate={toggleCompareCandidate}
        />
      }
    >
      <SectionCard
        eyebrow="Constituency brief"
        title={`${selectedConstituency.seats}-seat constituency`}
        description={selectedConstituency.summary}
        tone="accent"
      >
        <View style={styles.rowWrap}>
          {selectedConstituency.localIssues.map((issue) => (
            <TagPill key={issue} label={issue} tone="caution" />
          ))}
        </View>
        <View style={styles.buttonRow}>
          <ActionButton
            compact
            label="Official constituency lookup"
            onPress={() =>
              openExternalUrl(selectedConstituency.officialLinks[0].url, {
                onError: reportExternalLinkError,
                sourceLabel: selectedConstituency.officialLinks[0].label,
              })
            }
            tone="secondary"
          />
        </View>
        <SourceList
          sources={selectedConstituency.officialLinks}
          compact
          onExternalLinkError={reportExternalLinkError}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Boundary view"
        title="See the constituency on the map"
        description="The boundary map is now a real secondary input, not a decorative screenshot."
      >
        <ConstituencyBoundaryMap
          constituencies={constituencies}
          selectedConstituencyId={selectedConstituency.id}
          onSelectConstituency={selectConstituency}
          height={320}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Current TD list"
        title="Build a short list from your local public record"
        description="Add two to four current TD profiles to compare. Politiclear keeps unknowns visible instead of forcing fake certainty."
      >
        <View style={styles.comparePanel}>
          <Text style={styles.compareTitle}>
            {compareCandidateIds.length} profiles are selected. The sticky compare tray keeps the shortlist visible while you browse this area.
          </Text>
        </View>
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            isCompared={compareCandidateIds.includes(candidate.compareKey || candidate.id)}
            onOpen={() =>
              navigation.navigate("CandidateDetail", { candidateId: candidate.id })
            }
            onToggleCompare={() => toggleCompareCandidate(candidate.compareKey || candidate.id)}
            compareButtonDisabled={
              !canAddCompareCandidate(candidate.compareKey || candidate.id) &&
              !compareCandidateIds.includes(candidate.compareKey || candidate.id)
            }
            compareButtonLabel={
              compareCandidateIds.includes(candidate.compareKey || candidate.id)
                ? "Remove from compare"
                : canAddCompareCandidate(candidate.compareKey || candidate.id)
                  ? "Add to compare"
                  : "Compare full"
            }
            compareHelperText={
              !canAddCompareCandidate(candidate.compareKey || candidate.id) &&
              !compareCandidateIds.includes(candidate.compareKey || candidate.id)
                ? "Remove one selected profile to add another."
                : null
            }
          />
        ))}
      </SectionCard>

      <SectionCard
        eyebrow="2024 ballot shortlist"
        title="See the wider ballot, not just current TDs"
        description="Ballot-only profiles stay clearly labelled. Politiclear will surface official and party-linked sources without pretending they are parliamentary issue records."
        tone="info"
      >
        {electionCandidates.slice(0, 6).map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            isCompared={compareCandidateIds.includes(candidate.compareKey || candidate.id)}
            onOpen={() =>
              navigation.navigate("CandidateDetail", { candidateId: candidate.id })
            }
            onToggleCompare={() => toggleCompareCandidate(candidate.compareKey || candidate.id)}
            compareButtonDisabled={
              !canAddCompareCandidate(candidate.compareKey || candidate.id) &&
              !compareCandidateIds.includes(candidate.compareKey || candidate.id)
            }
            compareButtonLabel={
              compareCandidateIds.includes(candidate.compareKey || candidate.id)
                ? "Remove from compare"
                : canAddCompareCandidate(candidate.compareKey || candidate.id)
                  ? "Add to compare"
                  : "Compare full"
            }
            compareHelperText={
              !canAddCompareCandidate(candidate.compareKey || candidate.id) &&
              !compareCandidateIds.includes(candidate.compareKey || candidate.id)
                ? "Remove one selected profile to add another."
                : null
            }
          />
        ))}
      </SectionCard>

      <SectionCard
        eyebrow="Local watch"
        title="What is moving in this constituency"
        description={
          curatedLocalUpdates > 0
            ? "This keeps the area view tied to source-labelled official updates and reviewed curated local context."
            : "This area watch is currently official-only, so it stays close to the public record."
        }
      >
        {localUpdates.map((update) => (
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
              <View style={styles.updateCopy}>
                <Text style={styles.updateTitle}>{update.title}</Text>
                <Text style={styles.updateMeta}>
                  {update.sourceLabel} · {update.publishedAt}
                </Text>
              </View>
              <TagPill label={update.sourceType} tone="official" />
            </View>
            <Text style={styles.updateSummary}>{update.summary}</Text>
            <View style={styles.rowWrap}>
              {(update.issueTags || update.tags || []).map((tag) => (
                <TagPill key={`${update.id}-${tag}`} label={tag} tone="neutral" />
              ))}
            </View>
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

      <SectionCard
        eyebrow="Checklist"
        title="Do the practical tasks before election day"
        description="This keeps the app grounded in action: registration, ballot readiness, and polling-day logistics."
        tone="success"
      >
        {checklistSections.map((section) => (
          <View key={section.id} style={styles.checklistSection}>
            <Text style={styles.checklistTitle}>{section.title}</Text>
            <Text style={styles.checklistDescription}>{section.description}</Text>
            {section.items.map((item) => (
              <View key={item.id} style={styles.checklistItem}>
                <View style={styles.checklistCopy}>
                  <Text style={styles.checklistItemLabel}>{item.label}</Text>
                  <Text style={styles.checklistItemNote}>{item.note}</Text>
                </View>
                <ActionButton
                  compact
                  label="Open"
                  onPress={() =>
                    openExternalUrl(item.link.url, {
                      onError: reportExternalLinkError,
                      sourceLabel: item.label,
                    })
                  }
                  tone="secondary"
                />
              </View>
            ))}
          </View>
        ))}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  buttonRow: {
    marginBottom: spacing.sm,
  },
  comparePanel: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  compareTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  checklistSection: {
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  checklistTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 4,
  },
  checklistDescription: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  checklistItem: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  checklistCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  checklistItemLabel: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: 2,
  },
  checklistItemNote: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
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
  updateCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  updateTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
  },
  updateMeta: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    marginTop: 2,
  },
  updateSummary: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  updateReason: {
    color: palette.ink,
    fontSize: typography.caption,
    lineHeight: 18,
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
