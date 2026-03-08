import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ActionButton from "../../components/v2/ActionButton";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import SourceList from "../../components/v2/SourceList";
import TagPill from "../../components/v2/TagPill";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { palette, spacing, typography } from "../../theme/tokens";

export default function LearnHubScreen() {
  const {
    eligibilityFlow,
    getCandidatesForConstituency,
    getElectionCandidatesForConstituency,
    learningPaths,
    officialResources,
    reportExternalLinkError,
    selectedConstituency,
    stvGuide,
  } = usePoliticlear();
  const localCandidates = useMemo(() => {
    const current = getCandidatesForConstituency(selectedConstituency.id);
    const ballot = getElectionCandidatesForConstituency(selectedConstituency.id);

    return (ballot.length ? ballot : current).slice(0, 6);
  }, [selectedConstituency.id]);
  const [ballotOrder, setBallotOrder] = useState([]);
  const [questionId, setQuestionId] = useState(eligibilityFlow.startQuestionId);
  const [resultId, setResultId] = useState(null);

  const currentQuestion = questionId ? eligibilityFlow.questions[questionId] : null;
  const currentResult = resultId ? eligibilityFlow.results[resultId] : null;

  const toggleBallotPreference = (candidateId) => {
    setBallotOrder((currentOrder) => {
      if (currentOrder.includes(candidateId)) {
        return currentOrder.filter((id) => id !== candidateId);
      }

      return [...currentOrder, candidateId];
    });
  };

  const handleEligibilityAnswer = (answer) => {
    if (answer.resultId) {
      setResultId(answer.resultId);
      setQuestionId(null);
      return;
    }

    setQuestionId(answer.nextQuestionId);
  };

  const resetEligibility = () => {
    setQuestionId(eligibilityFlow.startQuestionId);
    setResultId(null);
  };

  return (
    <PageShell
      eyebrow="Learn"
      title="Understand the ballot, not just the headlines"
      subtitle="Politiclear turns complex voting rules into clear tasks: learn PR-STV, test your eligibility path, and build a sample ranking."
    >
      <SectionCard
        eyebrow="Learning paths"
        title="Three clean ways into the civic flow"
        description="Each path starts with a user need instead of a wall of civic jargon."
      >
        {learningPaths.map((path) => (
          <View key={path.id} style={styles.pathCard}>
            <Text style={styles.pathTitle}>{path.title}</Text>
            <Text style={styles.pathSummary}>{path.summary}</Text>
            <View style={styles.pathStepRow}>
              {path.steps.map((step) => (
                <TagPill key={step} label={step} tone="neutral" />
              ))}
            </View>
            <Text style={styles.pathNote}>
              {path.id === "first-vote"
                ? "Best if you want the practical checklist first."
                : path.id === "understand-pr-stv"
                  ? "Best if you want to practise ranking and avoid spoiled ballots."
                  : "Best if you want to compare profiles before ranking anyone."}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard
        eyebrow="PR-STV helper"
        title={`Practice with ${selectedConstituency.name}`}
        description="Tap a candidate to assign the next preference number. Tap again to remove them. Politiclear uses your local ballot list when it can."
        tone="info"
      >
        <Text style={styles.rankHint}>
          Current order:{" "}
          {ballotOrder.length
            ? ballotOrder
                .map(
                  (candidateId, index) =>
                    `${index + 1}. ${
                      localCandidates.find((candidate) => candidate.id === candidateId)?.name
                    }`
                )
                .join("  ")
            : "No preferences selected yet"}
        </Text>
        {localCandidates.map((candidate) => {
          const rank = ballotOrder.indexOf(candidate.id);

          return (
            <View key={candidate.id} style={styles.rankRow}>
              <View style={styles.rankCopy}>
                <Text style={styles.rankName}>{candidate.name}</Text>
                <Text style={styles.rankMeta}>{candidate.party}</Text>
              </View>
              <ActionButton
                compact
                label={rank >= 0 ? `Preference ${rank + 1}` : "Tap to rank"}
                onPress={() => toggleBallotPreference(candidate.id)}
                tone={rank >= 0 ? "secondary" : "primary"}
              />
            </View>
          );
        })}
        <View style={styles.guideList}>
          {stvGuide.map((step, index) => (
            <View key={step.id} style={styles.guideItem}>
              <Text style={styles.guideNumber}>{index + 1}</Text>
              <View style={styles.guideCopy}>
                <Text style={styles.guideTitle}>{step.title}</Text>
                <Text style={styles.guideBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.warningPanel}>
          <Text style={styles.warningTitle}>Spoiled ballot watch</Text>
          <Text style={styles.warningBody}>
            Do not rank two candidates with the same number, do not skip back and rewrite the same preference, and do not mark a party instead of a person.
          </Text>
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Eligibility"
        title="Check your path without dead ends"
        description="This replaces the broken old flow and keeps every branch explicit: Irish, British, EU, other citizens, and under-18."
      >
        {currentQuestion ? (
          <View>
            <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
            <View style={styles.answerStack}>
              {currentQuestion.answers.map((answer) => (
                <ActionButton
                  key={`${currentQuestion.id}-${answer.label}`}
                  label={answer.label}
                  onPress={() => handleEligibilityAnswer(answer)}
                  tone="secondary"
                />
              ))}
            </View>
          </View>
        ) : null}

        {currentResult ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{currentResult.title}</Text>
            <Text style={styles.resultSummary}>{currentResult.summary}</Text>
            <View style={styles.resultTags}>
              {currentResult.elections.map((election) => (
                <TagPill key={election} label={election} tone="official" />
              ))}
            </View>
            <SourceList
              sources={currentResult.sources}
              onExternalLinkError={reportExternalLinkError}
            />
            <ActionButton
              compact
              label="Restart eligibility check"
              onPress={resetEligibility}
              tone="secondary"
            />
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        eyebrow="First vote tasks"
        title="What to do before polling day"
        description="This turns the learning hub into a practical onboarding flow, not just a civic reading page."
        tone="warning"
      >
        <View style={styles.guideItem}>
          <Text style={styles.guideNumber}>1</Text>
          <View style={styles.guideCopy}>
            <Text style={styles.guideTitle}>Check your registration</Text>
            <Text style={styles.guideBody}>
              Start with the official register checker before you spend time comparing profiles.
            </Text>
          </View>
        </View>
        <View style={styles.guideItem}>
          <Text style={styles.guideNumber}>2</Text>
          <View style={styles.guideCopy}>
            <Text style={styles.guideTitle}>Confirm your constituency</Text>
            <Text style={styles.guideBody}>
              Make sure the shortlist you are comparing matches the actual ballot for {selectedConstituency.name}.
            </Text>
          </View>
        </View>
        <View style={styles.guideItem}>
          <Text style={styles.guideNumber}>3</Text>
          <View style={styles.guideCopy}>
            <Text style={styles.guideTitle}>Practise ranking candidates</Text>
            <Text style={styles.guideBody}>
              Build a sample order here first, then review the official PR-STV guide before polling day.
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Official sources"
        title="Keep the official guides open"
        description="Politiclear is most useful when it sits between you and the primary source, not in place of it."
        tone="success"
      >
        <SourceList
          sources={officialResources.slice(2, 6)}
          onExternalLinkError={reportExternalLinkError}
        />
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pathCard: {
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pathTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 4,
  },
  pathSummary: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  pathStepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pathNote: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  rankHint: {
    color: palette.civicStrong,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  rankRow: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  rankCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rankName: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 2,
  },
  rankMeta: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
  },
  guideList: {
    marginTop: spacing.md,
  },
  guideItem: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  warningPanel: {
    backgroundColor: palette.warningSoft,
    borderRadius: 18,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  warningTitle: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  warningBody: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  guideNumber: {
    color: palette.civicStrong,
    fontSize: typography.body,
    fontWeight: "800",
    marginRight: spacing.sm,
    width: 18,
  },
  guideCopy: {
    flex: 1,
  },
  guideTitle: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: 2,
  },
  guideBody: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  questionTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  answerStack: {
    gap: spacing.sm,
  },
  resultCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 18,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  resultTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  resultSummary: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  resultTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
});
