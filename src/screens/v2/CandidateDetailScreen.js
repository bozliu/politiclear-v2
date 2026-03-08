import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import ActionButton from "../../components/v2/ActionButton";
import CandidateAvatar from "../../components/v2/CandidateAvatar";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import SourceList from "../../components/v2/SourceList";
import TagPill from "../../components/v2/TagPill";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { palette, radii, spacing, typography } from "../../theme/tokens";

function EmptyEvidence({ label }) {
  return <Text style={styles.emptyText}>{label}</Text>;
}

function EvidenceBlock({ title, meta, onExternalLinkError, sources }) {
  return (
    <View style={styles.evidenceBlock}>
      <Text style={styles.evidenceTitle}>{title}</Text>
      {meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}
      <SourceList
        sources={sources}
        compact
        onExternalLinkError={onExternalLinkError}
      />
    </View>
  );
}

function groupSourcesByType(sources = []) {
  return sources.reduce((groups, source) => {
    const key = source?.sourceType || source?.type || "other";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(source);
    return groups;
  }, {});
}

export default function CandidateDetailScreen({ route, navigation }) {
  const candidateId = route.params?.candidateId;
  const {
    candidateDetailStatusById,
    compareCandidateIds,
    getCandidateById,
    loadCandidateDetail,
    reportExternalLinkError,
    toggleCompareCandidate,
  } = usePoliticlear();
  const candidate = getCandidateById(candidateId);
  const detailStatus = candidateDetailStatusById[candidateId];

  useEffect(() => {
    if (candidateId) {
      loadCandidateDetail(candidateId);
    }
  }, [candidateId]);

  if (!candidate) {
    return (
      <PageShell
        eyebrow="Profile"
        title="Candidate not found"
        subtitle="This route only supports candidates present in the current Politiclear release data set."
      />
    );
  }

  const isElectionCandidate = candidate.profileKind === "electionCandidate";

  const evidenceCounts = candidate.evidenceCounts || {
    committees: candidate.committees?.length || 0,
    offices: candidate.offices?.length || 0,
    questions: candidate.recentQuestions?.length || 0,
    debates: candidate.recentDebates?.length || 0,
    votes: candidate.recentVotes?.length || 0,
  };
  const primarySources = [
    ...(candidate.officialLinks || []),
    ...(candidate.partyLinks || []),
  ];
  const groupedSources = groupSourcesByType(candidate.sources || []);
  const summaryBasisMeta = `Updated ${candidate.lastUpdated} · ${candidate.sourceCount || candidate.sources?.length || 0} attached sources`;

  return (
    <PageShell
      actionLabel="Back"
      onActionPress={() => navigation.goBack()}
      eyebrow="Profile"
      title={candidate.name}
      subtitle={
        isElectionCandidate
          ? `${candidate.party} · ${candidate.constituencyName} · ${candidate.electedLabel || "2024 ballot candidate"} · Updated ${candidate.lastUpdated}`
          : `${candidate.party} · ${candidate.constituencyName} · ${candidate.issueEvidenceCount || 0} issue-linked topics · Updated ${candidate.lastUpdated}`
      }
    >
      <SectionCard
        eyebrow="Overview"
        title="Decision card"
        description="Politiclear keeps the source trail visible and does not turn missing evidence into fake certainty."
        tone="info"
      >
        <View style={styles.heroRow}>
          <CandidateAvatar candidate={candidate} size={148} style={styles.portrait} />
          <View style={styles.heroCopy}>
            <View style={styles.metaRow}>
                <TagPill label={candidate.party} tone="official" />
                {candidate.isIncumbent ? (
                <TagPill label="Current TD" tone="civic" />
              ) : null}
                {isElectionCandidate ? (
                  <TagPill label={candidate.electedLabel || "2024 ballot candidate"} tone="official" />
                ) : null}
                <TagPill
                  label={
                    candidate.issueEvidenceCount > 0
                      ? `Issue-linked ${candidate.issueEvidenceCount}`
                      : isElectionCandidate
                        ? "Ballot record"
                        : "Profile only"
                  }
                  tone={
                    candidate.issueEvidenceCount > 0
                      ? "civic"
                      : isElectionCandidate
                        ? "official"
                        : "caution"
                  }
                />
            </View>
            <Text style={styles.summary}>{candidate.summary}</Text>
            <Text style={styles.overview}>{candidate.overview}</Text>
            <Text style={styles.note}>Summary basis: {candidate.summaryBasis}</Text>
            <Text style={styles.note}>{candidate.coverageNote}</Text>
            <Text style={styles.note}>{candidate.sourceNote}</Text>
            <View style={styles.metaRow}>
              {(candidate.transparencyLabels || []).map((label) => (
                <TagPill
                  key={`${candidate.id}-${label}`}
                  label={label}
                  tone={label.includes("unknown") ? "caution" : "neutral"}
                />
              ))}
            </View>
            {candidate.provenanceSummary ? (
              <Text style={styles.note}>{candidate.provenanceSummary}</Text>
            ) : null}
            {primarySources.length ? (
              <View style={styles.heroSources}>
                <Text style={styles.heroSourcesLabel}>Primary links</Text>
                <SourceList
                  sources={primarySources.slice(0, 3)}
                  compact
                  onExternalLinkError={reportExternalLinkError}
                />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.countGrid}>
          {candidate.firstPreferenceVotes ? (
            <TagPill
              label={`${candidate.firstPreferenceVotes.toLocaleString()} first prefs`}
              tone="official"
            />
          ) : null}
          {candidate.gender ? (
            <TagPill label={`Gender ${candidate.gender}`} tone="neutral" />
          ) : null}
          <TagPill label={`${evidenceCounts.committees} committees`} tone="neutral" />
          <TagPill label={`${evidenceCounts.offices} offices`} tone="neutral" />
          <TagPill label={`${evidenceCounts.questions} questions`} tone="neutral" />
          <TagPill label={`${evidenceCounts.debates} debates`} tone="neutral" />
          <TagPill label={`${evidenceCounts.votes} votes`} tone="neutral" />
          <TagPill label={`${candidate.sourceCount || candidate.sources?.length || 0} sources`} tone="neutral" />
        </View>

        {detailStatus?.status === "loading" ? (
          <Text style={styles.loadingText}>Loading official evidence…</Text>
        ) : null}
        {detailStatus?.status === "refreshing" ? (
          <Text style={styles.loadingText}>
            Showing the bundled official snapshot while Politiclear refreshes live evidence.
          </Text>
        ) : null}
        {detailStatus?.status === "bundled" ? (
          <Text style={styles.loadingText}>
            Live detail is unavailable right now, so this screen is using the bundled official snapshot.
          </Text>
        ) : null}
        {detailStatus?.status === "error" ? (
          <Text style={styles.errorText}>
            Candidate detail API is unavailable right now, so this screen is showing the best local fallback.
          </Text>
        ) : null}

        <View style={styles.buttonStack}>
          <ActionButton
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
          <ActionButton
            label="Open compare matrix"
            onPress={() => navigation.navigate("CandidateCompare")}
            tone="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Evidence basis"
        title="How this profile is sourced"
        description="Politiclear separates project-authored summaries from the underlying record so you can see what is official, what is party-linked, and what is still missing."
        tone="success"
      >
        <EvidenceBlock
          title="Politiclear summary"
          meta={summaryBasisMeta}
          onExternalLinkError={reportExternalLinkError}
          sources={primarySources.slice(0, 3)}
        />
        <View style={styles.countGrid}>
          <TagPill label={`${(groupedSources.official || []).length} official`} tone="official" />
          <TagPill label={`${(groupedSources.oireachtas || []).length} oireachtas`} tone="civic" />
          <TagPill label={`${(groupedSources.party || []).length} party`} tone="neutral" />
          <TagPill label={`${(groupedSources.media || []).length} media`} tone="neutral" />
          <TagPill label={`${(groupedSources["fact-check"] || []).length} fact-check`} tone="neutral" />
          <TagPill label={`${(groupedSources.project || []).length} project`} tone="neutral" />
        </View>
        <Text style={styles.note}>
          Official and Oireachtas records are primary evidence. Party, media, fact-check, and project-authored summary layers stay visually separate on purpose.
        </Text>
      </SectionCard>

      <SectionCard
        eyebrow="Issue rows"
        title="What Politiclear can verify"
        description="Issue rows stay visible even when the only honest answer is that stronger evidence has not been attached yet."
      >
        {(candidate.keyIssues || []).map((issue) => (
          <View key={issue.issueId} style={styles.issueBlock}>
            <Text style={styles.issueTitle}>{issue.label}</Text>
            <Text style={styles.issueStance}>{issue.stance}</Text>
            <Text style={styles.issueSummary}>{issue.summary}</Text>
            {issue.source ? (
              <SourceList sources={[issue.source]} compact />
            ) : (
              <Text style={styles.emptyText}>No issue-linked source attached yet.</Text>
            )}
          </View>
        ))}
      </SectionCard>

      <SectionCard
        eyebrow="Committees & offices"
        title="Formal roles"
        description="These are official membership records, not inferred labels."
      >
        <Text style={styles.sectionLabel}>Committees</Text>
        {candidate.committees?.length ? (
          candidate.committees.map((committee) => (
            <EvidenceBlock
              key={`${committee.name}-${committee.role}`}
              title={committee.name}
              meta={`${committee.role} · ${committee.houseCode || "Unknown house"} · ${committee.status}`}
              onExternalLinkError={reportExternalLinkError}
              sources={[committee.source]}
            />
          ))
        ) : (
          <EmptyEvidence label="No verified committee record yet" />
        )}

        <Text style={styles.sectionLabel}>Offices</Text>
        {candidate.offices?.length ? (
          candidate.offices.map((office) => (
            <EvidenceBlock
              key={`${office.title}-${office.dateRange}`}
              title={office.title}
              meta={office.dateRange}
              onExternalLinkError={reportExternalLinkError}
              sources={[office.source]}
            />
          ))
        ) : (
          <EmptyEvidence label="No verified office record yet" />
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Questions & debates"
        title="Recent parliamentary activity"
        description="These links are intended as jump-off points into the official record."
      >
        <Text style={styles.sectionLabel}>Recent questions</Text>
        {candidate.recentQuestions?.length ? (
          candidate.recentQuestions.map((question) => (
            <EvidenceBlock
              key={`${question.title}-${question.date}-${question.questionNumber}`}
              title={question.title}
              meta={`${question.date} · Q${question.questionNumber || "?"} · To ${question.to} · ${question.answerState}`}
              onExternalLinkError={reportExternalLinkError}
              sources={[question.source]}
            />
          ))
        ) : (
          <EmptyEvidence label="No verified question record yet" />
        )}

        <Text style={styles.sectionLabel}>Recent debates</Text>
        {candidate.recentDebates?.length ? (
          candidate.recentDebates.map((debate) => (
            <EvidenceBlock
              key={`${debate.title}-${debate.date}`}
              title={debate.title}
              meta={`${debate.date} · ${debate.debateType}`}
              onExternalLinkError={reportExternalLinkError}
              sources={[debate.source]}
            />
          ))
        ) : (
          <EmptyEvidence label="No verified debate record yet" />
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Votes & sources"
        title="Recent votes and primary links"
        description="Vote records and source links are separated from Politiclear summaries on purpose."
        tone="civic"
      >
        <Text style={styles.sectionLabel}>Recent votes</Text>
        {candidate.recentVotes?.length ? (
          candidate.recentVotes.map((vote) => (
            <EvidenceBlock
              key={`${vote.title}-${vote.date}-${vote.resultLabel}`}
              title={vote.title}
              meta={`${vote.date} · ${vote.resultLabel}`}
              onExternalLinkError={reportExternalLinkError}
              sources={[vote.source]}
            />
          ))
        ) : (
          <EmptyEvidence label="No verified vote record yet" />
        )}

        <Text style={styles.sectionLabel}>Primary sources</Text>
        <SourceList
          sources={primarySources}
          onExternalLinkError={reportExternalLinkError}
        />
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  portrait: {
    marginRight: spacing.lg,
    marginBottom: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  summary: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  overview: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  note: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  countGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  loadingText: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  errorText: {
    color: palette.accent,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  heroSources: {
    marginTop: spacing.md,
  },
  heroSourcesLabel: {
    color: palette.ink,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  issueBlock: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  issueTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 4,
  },
  issueStance: {
    color: palette.civicStrong,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  issueSummary: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    color: palette.ink,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: "uppercase",
  },
  evidenceBlock: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  evidenceTitle: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: 4,
  },
  evidenceMeta: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
});
