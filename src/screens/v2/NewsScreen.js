import { Pressable, StyleSheet, Text, View } from "react-native";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import TagPill from "../../components/v2/TagPill";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { palette, spacing, typography } from "../../theme/tokens";
import { openExternalUrl } from "../../utils/externalLinks";

export default function NewsScreen() {
  const { getNewsFeed, reportExternalLinkError, selectedConstituency } = usePoliticlear();
  const updates = getNewsFeed(selectedConstituency.id);
  const officialCount = updates.filter((update) => update.sourceType === "official").length;
  const curatedCount = updates.length - officialCount;

  return (
    <PageShell
      eyebrow="News and updates"
      title={`Tracked updates for ${selectedConstituency.name}`}
      subtitle={
        curatedCount > 0
          ? "This feed mixes official links and Politiclear-curated briefs, but it always labels the source type, provenance, and why the item matters."
          : "This feed is currently official-only and stays anchored to source-labeled civic updates."
      }
    >
      <SectionCard
        eyebrow="Feed"
        title="Source-labeled constituency watch"
        description="The feed is not a generic media wall. It tries to answer why each item matters to this ballot."
      >
        <View style={styles.summaryRow}>
          <TagPill label={`${updates.length} updates`} tone="official" />
          <TagPill label={`${officialCount} official`} tone="civic" />
          {curatedCount > 0 ? (
            <TagPill label={`${curatedCount} reviewed curated`} tone="neutral" />
          ) : null}
        </View>
        {!updates.length ? (
          <Text style={styles.emptyState}>
            No renderable updates passed the current source-policy rules for this constituency.
          </Text>
        ) : null}
        {updates.map((update) => (
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
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{update.title}</Text>
                <Text style={styles.meta}>
                  {update.sourceLabel} · {update.publishedAt}
                </Text>
              </View>
              <TagPill label={update.sourceType} tone="official" />
            </View>
            <Text style={styles.summary}>{update.summary}</Text>
            <View style={styles.tagRow}>
              {(update.issueTags || update.tags || []).map((tag) => (
                <TagPill key={`${update.id}-${tag}`} label={tag} tone="neutral" />
              ))}
            </View>
            <Text style={styles.whyItMatters}>
              Why it matters: {update.relevanceReason || update.whyItMatters}
            </Text>
            {update.provenance ? (
              <Text style={styles.editorialNote}>Provenance: {update.provenance}</Text>
            ) : null}
            {update.reviewState ? (
              <Text style={styles.editorialNote}>Review state: {update.reviewState}</Text>
            ) : null}
            {update.editorialNote ? (
              <Text style={styles.editorialNote}>Editorial note: {update.editorialNote}</Text>
            ) : null}
          </Pressable>
        ))}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  headerCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 2,
  },
  meta: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  summary: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.xs,
  },
  whyItMatters: {
    color: palette.ink,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  editorialNote: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  emptyState: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
