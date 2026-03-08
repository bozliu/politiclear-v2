import { StyleSheet, Text, View } from "react-native";
import PageShell from "../../components/v2/PageShell";
import SectionCard from "../../components/v2/SectionCard";
import SourceList from "../../components/v2/SourceList";
import { getPublicBetaPage } from "../../data/publicBetaPages";
import { palette, spacing, typography } from "../../theme/tokens";

export default function PublicInfoScreen({ navigation, route }) {
  const page = getPublicBetaPage(route.params?.pageId);

  return (
    <PageShell
      actionLabel="Back"
      onActionPress={() => navigation.goBack()}
      eyebrow="Transparency"
      title={page.title}
      subtitle={page.subtitle}
    >
      {page.sections.map((section) => (
        <SectionCard
          key={`${page.id}-${section.title}`}
          eyebrow="Policy"
          title={section.title}
          description={section.body}
          tone="info"
        >
          <View style={styles.ruleCard}>
            <Text style={styles.ruleText}>{section.body}</Text>
          </View>
        </SectionCard>
      ))}

      {page.externalLinks?.length ? (
        <SectionCard
          eyebrow="Action"
          title="Useful links"
          description="These links sit outside Politiclear and should be treated as the authoritative next step when you need to escalate or verify."
          tone="success"
        >
          <SourceList sources={page.externalLinks} />
        </SectionCard>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  ruleCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.md,
  },
  ruleText: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    lineHeight: 22,
  },
});
