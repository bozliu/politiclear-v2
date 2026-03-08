import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import CandidateCard from "../../components/v2/CandidateCard";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import ActionButton from "../../components/v2/ActionButton";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function CandidatesScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const {
    clearCompareCandidates,
    compareCandidateIds,
    getElectionCandidatesForConstituency,
    getCandidatesForConstituency,
    selectedConstituency,
    toggleCompareCandidate,
  } = usePoliticlear();

  const filteredCurrentRepresentatives = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return getCandidatesForConstituency(selectedConstituency.id).filter((candidate) => {
      if (!normalized) {
        return true;
      }

      return `${candidate.name} ${candidate.party}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [getCandidatesForConstituency, query, selectedConstituency.id]);
  const filteredElectionCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return getElectionCandidatesForConstituency(selectedConstituency.id)
      .filter((candidate) => {
        if (!normalized) {
          return true;
        }

        return `${candidate.name} ${candidate.party} ${candidate.electedLabel || ""}`
          .toLowerCase()
          .includes(normalized);
      })
      .sort((left, right) => {
        const voteDelta =
          (right.firstPreferenceVotes || 0) - (left.firstPreferenceVotes || 0);
        if (voteDelta !== 0) {
          return voteDelta;
        }

        return left.name.localeCompare(right.name);
      });
  }, [getElectionCandidatesForConstituency, query, selectedConstituency.id]);

  return (
    <PageShell
      eyebrow="Representatives & Candidates"
      title={`Ballot coverage for ${selectedConstituency.name}`}
      subtitle="Browse the current TD layer and the full 2024 general election ballot in the same constituency context. Compare now supports mixed local profiles while keeping missing issue evidence explicit."
    >
      <SectionCard
        eyebrow="Filter"
        title="Search by name or party"
        description="This release keeps comparison constituency-specific so the user does not lose place."
      >
        <TextInput
          autoCapitalize="words"
          onChangeText={setQuery}
          placeholder="Search profiles, candidates, or parties"
          placeholderTextColor={palette.inkMuted}
          style={styles.input}
          value={query}
        />
        <View style={styles.banner}>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>
              {compareCandidateIds.length} profiles in compare
            </Text>
            <Text style={styles.bannerText}>
              Pick between two and four profiles for a source-linked issue matrix.
            </Text>
          </View>
          <View style={styles.bannerActions}>
            <ActionButton
              compact
              label="Open compare"
              onPress={() => navigation.navigate("CandidateCompare")}
              tone="secondary"
            />
            <ActionButton
              compact
              label="Clear"
              onPress={clearCompareCandidates}
              tone="secondary"
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Current TDs"
        title="Current representative cards"
        description="Each card shows issue rows, source count, and update date before you open the detail view."
      >
        {filteredCurrentRepresentatives.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            isCompared={compareCandidateIds.includes(candidate.compareKey || candidate.id)}
            onOpen={() =>
              navigation.navigate("CandidateDetail", { candidateId: candidate.id })
            }
            onToggleCompare={() => toggleCompareCandidate(candidate.compareKey || candidate.id)}
          />
        ))}
      </SectionCard>

      <SectionCard
        eyebrow="2024 ballot"
        title={`${filteredElectionCandidates.length} official election candidate profiles`}
        description="These cards come from the official 34th Dáil general election results publication. They keep full ballot coverage visible even when detailed parliamentary evidence is not available."
      >
        {filteredElectionCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onOpen={() =>
              navigation.navigate("CandidateDetail", { candidateId: candidate.id })
            }
            isCompared={compareCandidateIds.includes(candidate.compareKey || candidate.id)}
            onToggleCompare={() => toggleCompareCandidate(candidate.compareKey || candidate.id)}
          />
        ))}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: palette.background,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.ink,
    fontSize: typography.body,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  banner: {
    backgroundColor: palette.civicStrong,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  bannerCopy: {
    marginBottom: spacing.sm,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: typography.body,
    fontWeight: "800",
    marginBottom: 4,
  },
  bannerText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  bannerActions: {
    gap: spacing.sm,
  },
});
