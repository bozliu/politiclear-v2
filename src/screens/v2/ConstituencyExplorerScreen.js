import { Pressable, StyleSheet, Text, View } from "react-native";
import ConstituencyBoundaryMap from "../../components/v2/ConstituencyBoundaryMap";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import TagPill from "../../components/v2/TagPill";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function ConstituencyExplorerScreen({ navigation }) {
  const { constituencies, selectedConstituency, selectConstituency } =
    usePoliticlear();

  return (
    <PageShell
      actionLabel="Back"
      onActionPress={() => navigation.goBack()}
      eyebrow="Explorer"
      title="Constituency explorer"
      subtitle="Search still comes first, but this screen now uses official boundary data so the secondary map view is genuinely interactive."
    >
      <SectionCard
        eyebrow="Interactive map"
        title="Tap a real constituency boundary"
        description="This explorer keeps map selection secondary, but it no longer pretends a static image is interactive."
        tone="warning"
      >
        <ConstituencyBoundaryMap
          constituencies={constituencies}
          selectedConstituencyId={selectedConstituency.id}
          onSelectConstituency={(constituencyId) => selectConstituency(constituencyId)}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Constituency list"
        title="Select a local dashboard"
        description="Selection is still search-first, but this screen keeps the full constituency list visible beside the boundary map."
      >
        {constituencies.map((constituency) => (
          <Pressable
            key={constituency.id}
            onPress={() => {
              selectConstituency(constituency.id);
              navigation.goBack();
            }}
            style={({ pressed }) => [
              styles.row,
              selectedConstituency.id === constituency.id && styles.rowActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.copy}>
              <Text style={styles.title}>{constituency.name}</Text>
              <Text style={styles.summary}>{constituency.summary}</Text>
            </View>
            <TagPill label={`${constituency.seats} seats`} tone="official" />
          </Pressable>
        ))}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  rowActive: {
    backgroundColor: palette.info,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  copy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 4,
  },
  summary: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
