import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, spacing, typography } from "../../theme/tokens";
import { openExternalUrl } from "../../utils/externalLinks";

export default function SourceList({
  sources = [],
  compact = false,
  onExternalLinkError,
}) {
  const validSources = sources.filter((source) => source?.label && source?.url);

  if (!validSources.length) {
    return <Text style={styles.empty}>No verified source yet</Text>;
  }

  return (
    <View>
      {validSources.map((source) => (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open source: ${source.label}`}
          key={`${source.label}-${source.url}`}
          onPress={() =>
            openExternalUrl(source.url, {
              onError: onExternalLinkError,
              sourceLabel: source.label,
            })
          }
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={[styles.label, compact && styles.compactLabel]}>
            {source.label}
          </Text>
          {source.sourceType || source.type || source.lastUpdated || source.confidence ? (
            <Text style={[styles.meta, compact && styles.compactMeta]}>
              {[
                source.sourceType || source.type,
                source.confidence ? `${source.confidence} confidence` : null,
                source.lastUpdated ? `Updated ${source.lastUpdated}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
          {source.note ? (
            <Text style={[styles.note, compact && styles.compactNote]}>
              {source.note}
            </Text>
          ) : null}
          {source.provenance ? (
            <Text style={[styles.note, compact && styles.compactNote]}>
              Provenance: {source.provenance}
            </Text>
          ) : null}
          {source.reviewState ? (
            <Text style={[styles.note, compact && styles.compactNote]}>
              Review state: {source.reviewState}
            </Text>
          ) : null}
          {source.editorialNote ? (
            <Text style={[styles.note, compact && styles.compactNote]}>
              Editorial note: {source.editorialNote}
            </Text>
          ) : null}
          {source.license || source.isEdited ? (
            <Text style={[styles.license, compact && styles.compactNote]}>
              {[
                source.license ? `License ${source.license}` : null,
                source.isEdited ? "Edited summary" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: palette.civicStrong,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    marginBottom: 2,
  },
  note: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  meta: {
    color: palette.inkMuted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginBottom: 2,
    textTransform: "capitalize",
  },
  compactLabel: {
    fontSize: typography.caption,
  },
  compactMeta: {
    fontSize: 10,
    lineHeight: 14,
  },
  compactNote: {
    fontSize: 11,
    lineHeight: 16,
  },
  license: {
    color: palette.inkMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  empty: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
  },
});
