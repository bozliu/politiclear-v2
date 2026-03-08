import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, radii, spacing, typography } from "../../theme/tokens";
import ActionButton from "./ActionButton";
import TagPill from "./TagPill";
import { usePoliticlear } from "../../state/PoliticlearContext";
import { PUBLIC_BETA_PAGE_IDS } from "../../data/publicBetaPages";

export default function PageShell({
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  actionLabel,
  onActionPress,
}) {
  const navigation = useNavigation();
  const { clearOperationalNotice, dataState, lookupPrecisionCapabilities, operationalNotice } =
    usePoliticlear();
  const statusLabel =
    dataState.mode === "api"
      ? dataState.label
      : dataState.mode === "bundled"
        ? dataState.label || "Bundled official snapshot"
        : "Sample fallback";
  const statusTone =
    dataState.mode === "api"
      ? "official"
      : dataState.mode === "bundled"
        ? "civic"
        : "caution";
  const statusText =
    dataState.mode === "api"
      ? dataState.syncStatus === "stale"
        ? "This snapshot is older than the freshness window. Refresh the data sync before treating it as current."
        : null
      : dataState.mode === "bundled"
        ? "Politiclear is serving the verified bundled official snapshot while the live API refresh completes."
        : "API unavailable, so the app is using the local fallback while keeping source links visible.";
  const lookupCaveat = `Lookup honesty: constituency names can be exact, address-style input may be blocked into an official handoff, and Eircodes are routing-key matches (${lookupPrecisionCapabilities.address} / ${lookupPrecisionCapabilities.eircode}).`;
  const trustFooterLinks = [
    { label: "Methodology", pageId: PUBLIC_BETA_PAGE_IDS.methodology },
    { label: "Data sources", pageId: PUBLIC_BETA_PAGE_IDS.dataSources },
    { label: "Source policy", pageId: PUBLIC_BETA_PAGE_IDS.sourcePolicy },
    { label: "Editorial standards", pageId: PUBLIC_BETA_PAGE_IDS.editorialStandards },
    { label: "Limitations", pageId: PUBLIC_BETA_PAGE_IDS.limitations },
    { label: "Privacy", pageId: PUBLIC_BETA_PAGE_IDS.privacyContact },
    { label: "Corrections", pageId: PUBLIC_BETA_PAGE_IDS.corrections },
    { label: "Report an issue", pageId: PUBLIC_BETA_PAGE_IDS.reportProblem },
  ];
  const monitoringSummary = dataState.monitoring || null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.backgroundShapeTop} />
      <View style={styles.backgroundShapeBottom} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroAccentLine} />
          {actionLabel && onActionPress ? (
            <View style={styles.actionRow}>
              <ActionButton
                compact
                label={actionLabel}
                onPress={onActionPress}
                tone="secondary"
              />
            </View>
          ) : null}
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.statusRow}>
            <TagPill label={dataState.releaseStageLabel || "Live service"} tone="official" />
            <TagPill label={statusLabel} tone={statusTone} />
            <TagPill label={`Updated ${dataState.lastUpdated}`} tone="neutral" />
            <TagPill
              label={
                dataState.syncStatus === "stale"
                  ? "Stale snapshot"
                  : `Freshness ${dataState.staleAfterDays || 2}d`
              }
              tone={dataState.syncStatus === "stale" ? "caution" : "official"}
            />
          </View>
          <Text style={styles.releaseRule}>
            Politiclear is currently a public beta for an independent civic information service,
            not an official state site. Confirm constituency, registration, and ballot guidance
            with the linked official sources before acting.
          </Text>
          <Text style={styles.lookupText}>{lookupCaveat}</Text>
          <Text style={styles.lookupText}>
            Policy {dataState.contentPolicyVersion || "unknown"} · Methodology{" "}
            {dataState.methodologyVersion || "unknown"} · Fallback mode{" "}
            {dataState.fallbackMode || "unknown"}
          </Text>
          {statusText ? (
            <Text style={styles.statusText}>
              {dataState.error ? `${statusText} (${dataState.error})` : statusText}
            </Text>
          ) : null}
          {monitoringSummary ? (
            <Text style={styles.statusText}>
              Release monitor: {monitoringSummary.alertState || "normal"} ·{" "}
              {monitoringSummary.incidentsLast24h || 0} incidents in the last 24h
            </Text>
          ) : null}
          {operationalNotice ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{operationalNotice.title}</Text>
              <Text style={styles.noticeBody}>{operationalNotice.body}</Text>
              <View style={styles.noticeActions}>
                <ActionButton
                  compact
                  label="Dismiss"
                  onPress={clearOperationalNotice}
                  tone="secondary"
                />
              </View>
            </View>
          ) : null}
        </View>
        <View>{children}</View>
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Trust and transparency</Text>
          <Text style={styles.footerBody}>
            Keep methodology, source policy, limitations, privacy, corrections, and the public
            issue channel one tap away while using Politiclear.
          </Text>
          <View style={styles.footerButtonRow}>
            {trustFooterLinks.map((item) => (
              <ActionButton
                key={item.pageId}
                compact
                label={item.label}
                onPress={() => navigation.navigate("PublicInfo", { pageId: item.pageId })}
                tone="secondary"
              />
            ))}
          </View>
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  backgroundShapeTop: {
    backgroundColor: palette.civicSoft,
    borderBottomLeftRadius: 260,
    height: 300,
    opacity: 0.88,
    position: "absolute",
    right: -20,
    top: -90,
    width: 310,
  },
  backgroundShapeBottom: {
    backgroundColor: palette.accentSoft,
    borderTopLeftRadius: 220,
    bottom: -20,
    height: 250,
    opacity: 0.88,
    position: "absolute",
    right: -10,
    width: 260,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderRadius: 40,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.xl,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  heroAccentLine: {
    backgroundColor: palette.civic,
    borderRadius: 999,
    height: 6,
    marginBottom: spacing.md,
    width: 96,
  },
  actionRow: {
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: palette.civic,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  title: {
    color: palette.ink,
    fontSize: typography.hero,
    fontWeight: "800",
    marginBottom: spacing.xs,
    maxWidth: 700,
  },
  subtitle: {
    color: palette.inkMuted,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 760,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  statusText: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  releaseRule: {
    color: palette.ink,
    fontSize: typography.caption,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  lookupText: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  noticeCard: {
    backgroundColor: palette.warningSoft,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  noticeTitle: {
    color: palette.ink,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  noticeBody: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  noticeActions: {
    alignItems: "flex-start",
    marginTop: spacing.sm,
  },
  footerCard: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  footerTitle: {
    color: palette.ink,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  footerBody: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  footerButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
  },
});
