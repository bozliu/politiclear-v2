import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { palette, radii, spacing, typography } from "../../theme/tokens";
import { openExternalUrl } from "../../utils/externalLinks";
import ActionButton from "./ActionButton";
import TagPill from "./TagPill";

const ADDRESS_STYLE_PATTERN =
  /\b\d+[a-z]?\b|\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|apartment|apt|unit|estate|park|close|court|square|way)\b/i;

export default function ConstituencyFinderCard({
  selectedConstituency,
  onSelectConstituency,
  onOpenMap,
  onExternalLinkError,
  findMatches,
  lookupConstituencies,
  lookupModes = [],
  helperText = "Search by constituency name, town/locality, or routing-key Eircode.",
}) {
  const [query, setQuery] = useState(selectedConstituency?.name || "");
  const queryRef = useRef(selectedConstituency?.name || "");
  const previousSelectedNameRef = useRef(selectedConstituency?.name || "");
  const [lookupState, setLookupState] = useState({
    autoAppliedEligible: false,
    blocked: false,
    fallbackUsed: false,
    handoff: null,
    matchKind: null,
    resultStatus: "idle",
    selectedResult: null,
    lookupMode: "query",
    results: [],
    status: "idle",
  });

  const handleQueryChange = (nextQuery) => {
    queryRef.current = nextQuery;
    setQuery(nextQuery);
  };

  useEffect(() => {
    const previousSelectedName = previousSelectedNameRef.current;
    const currentQuery = queryRef.current;
    if (
      selectedConstituency?.name &&
      (!currentQuery.trim() || currentQuery === previousSelectedName)
    ) {
      handleQueryChange(selectedConstituency.name);
    }
    previousSelectedNameRef.current = selectedConstituency?.name || "";
  }, [selectedConstituency?.name]);

  const localResults = useMemo(
    () => (findMatches ? findMatches(query).slice(0, 6) : []),
    [findMatches, query]
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !lookupConstituencies) {
      setLookupState({
        autoAppliedEligible: false,
        blocked: false,
        fallbackUsed: false,
        handoff: null,
        matchKind: null,
        resultStatus: "idle",
        selectedResult: null,
        lookupMode: "query",
        results: [],
        status: "idle",
      });
      return undefined;
    }

    let isActive = true;
    const timerId = setTimeout(async () => {
      setLookupState((current) => ({
        ...current,
        status: "loading",
      }));

      const maybeEircode = /\b(?:[AC-FHKNPRTV-Y]\d{2}|D6W|D\d{2})(?:\s?[0-9AC-FHKNPRTV-Y]{4})?\b/i.test(
        trimmedQuery
      );
      const response = await lookupConstituencies(
        maybeEircode
          ? { eircode: trimmedQuery }
          : ADDRESS_STYLE_PATTERN.test(trimmedQuery)
            ? { address: trimmedQuery }
            : { query: trimmedQuery }
      );

      if (!isActive) {
        return;
      }

      setLookupState({
        autoAppliedEligible: Boolean(response?.autoAppliedEligible),
        fallbackUsed: Boolean(response?.fallbackUsed),
        lookupConfidence: response?.lookupConfidence || null,
        lookupMatchKind: response?.matchKind || null,
        lookupMatchReason: response?.lookupMatchReason || null,
        matchKind: response?.matchKind || null,
        lookupMode: response?.lookupMode || "query",
        lookupPrecision: response?.lookupPrecision || "best-match-locality",
        officialEquivalent: Boolean(response?.officialEquivalent),
        blocked: Boolean(response?.blocked),
        handoff: response?.handoff || null,
        resultStatus: response?.status || "no-match",
        selectedResult: response?.selectedResult || null,
        results: response?.results || [],
        status: "loaded",
      });
    }, 220);

    return () => {
      isActive = false;
      clearTimeout(timerId);
    };
  }, [lookupConstituencies, query]);

  useEffect(() => {
    if (
      lookupState.status === "loaded" &&
      lookupState.resultStatus === "resolved" &&
      lookupState.autoAppliedEligible &&
      lookupState.selectedResult?.id &&
      selectedConstituency?.id !== lookupState.selectedResult.id
    ) {
      onSelectConstituency(lookupState.selectedResult.id);
    }
  }, [
    lookupState.autoAppliedEligible,
    lookupState.resultStatus,
    lookupState.selectedResult?.id,
    lookupState.status,
    onSelectConstituency,
    selectedConstituency?.id,
  ]);

  const results = lookupState.results.length ? lookupState.results.slice(0, 6) : localResults;
  const lookupKindLabel =
    lookupState.blocked
      ? "Official handoff"
      : lookupState.resultStatus === "resolved" && lookupState.lookupMode === "eircode"
        ? "Routing-key match"
      : lookupState.resultStatus === "ambiguous" && lookupState.lookupMode === "eircode"
        ? "Ambiguous routing-key match"
      : lookupState.lookupMatchKind === "exact" || lookupState.matchKind === "exact"
        ? "Exact match"
      : lookupState.lookupMatchKind === "best" || lookupState.matchKind === "best"
        ? "Best match"
      : lookupState.resultStatus === "ambiguous"
        ? "Results only"
        : lookupState.lookupMatchKind === "fallback" || lookupState.matchKind === "fallback"
          ? "Fallback search"
          : null;
  const lookupSummary =
    lookupState.status === "loading"
      ? "Checking constituency name, locality, and routing-key Eircode rules…"
      : lookupState.blocked
        ? lookupState.handoff?.reason ||
          "Politiclear does not claim exact address-level constituency resolution. Use the official tool for full address lookup."
      : lookupState.resultStatus === "resolved" && lookupState.lookupMode === "eircode"
        ? `Routing-key match resolved to ${lookupState.selectedResult?.name || "the top constituency result"}. Politiclear can auto-apply unique routing-key matches, but a full Eircode or official lookup may still be needed for final confirmation.`
      : lookupState.resultStatus === "ambiguous" && lookupState.lookupMode === "eircode"
        ? "This routing key maps to more than one constituency in Politiclear's audited lookup table. Review the candidate list below and confirm with a fuller address or the official tool."
      : lookupState.resultStatus === "ambiguous"
        ? "Politiclear found possible matches but did not auto-apply one. Review the results below and select the correct constituency."
      : lookupState.results.length
        ? `Lookup mode: ${lookupState.lookupMode}. Precision: ${lookupState.lookupPrecision || "best-match-locality"}. Match reason: ${lookupState.lookupMatchReason || "source-linked search"}. Official-equivalent: ${lookupState.officialEquivalent ? "yes" : "no"}.`
        : query.trim() && lookupState.status === "loaded"
          ? "No exact structured lookup yet, so Politiclear is falling back to constituency and locality search."
          : null;
  const selectionHint =
    lookupState.resultStatus === "resolved" &&
    lookupState.autoAppliedEligible &&
    lookupState.selectedResult?.id === selectedConstituency?.id &&
    query.trim() &&
    lookupState.lookupMode === "eircode"
      ? `Applied automatically from ${lookupState.lookupPrecision}.`
      : lookupState.resultStatus === "ambiguous"
        ? "Results shown below are not applied until you choose one."
        : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.label}>Find your constituency</Text>
          <Text style={styles.helper}>{helperText}</Text>
        </View>
        {onOpenMap ? (
          <ActionButton
            compact
            label="Open live map"
            onPress={onOpenMap}
            tone="secondary"
          />
        ) : null}
      </View>
      <TextInput
        accessibilityLabel="Search constituency, town, or routing-key Eircode"
        autoCapitalize="words"
        onChangeText={handleQueryChange}
        placeholder="Search constituency, town, or routing-key Eircode"
        placeholderTextColor={palette.inkMuted}
        style={styles.input}
        value={query}
      />
      {lookupKindLabel || lookupSummary ? (
        <View style={styles.lookupSummaryRow}>
          {lookupKindLabel ? (
            <TagPill
              label={lookupKindLabel}
              tone={
                lookupState.blocked
                  ? "caution"
                  : lookupState.resultStatus === "resolved" && lookupState.lookupMode === "eircode"
                    ? "official"
                  : lookupState.resultStatus === "ambiguous"
                    ? "caution"
                  : lookupState.matchKind === "exact"
                  ? "civic"
                  : lookupState.matchKind === "best"
                    ? "official"
                    : "caution"
              }
            />
          ) : null}
          {lookupSummary ? (
            <Text style={styles.lookupSummary}>{lookupSummary}</Text>
          ) : null}
        </View>
      ) : null}
      {lookupState.blocked && lookupState.handoff?.url ? (
        <View style={styles.lookupActionRow}>
          <ActionButton
            compact
            label="Use official lookup"
            onPress={() =>
              openExternalUrl(lookupState.handoff.url, {
                onError: onExternalLinkError,
                sourceLabel: lookupState.handoff.label,
              })
            }
            tone="secondary"
          />
        </View>
      ) : null}
      {selectionHint ? (
        <Text style={styles.selectionHint}>{selectionHint}</Text>
      ) : null}
      <View style={styles.resultList}>
        {results.map((result) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select constituency ${result.name}`}
            key={result.id}
            onPress={() => {
              handleQueryChange(result.name);
              onSelectConstituency(result.id);
            }}
            style={({ pressed }) => [
              styles.resultItem,
              selectedConstituency?.id === result.id && styles.resultItemActive,
              pressed && styles.resultItemPressed,
            ]}
          >
            <View style={styles.resultMeta}>
              <Text style={styles.resultTitle}>{result.name}</Text>
              <Text style={styles.resultSubtitle}>
                {result.seats} seats · Updated {result.updatedAt}
              </Text>
              {result.lookupMatchKind || result.lookupMatchReason ? (
                <Text style={styles.resultLookupMeta}>
                  {[
                    result.lookupMode || lookupState.lookupMode || "query",
                    result.lookupPrecision || lookupState.lookupPrecision || "best-match-locality",
                    result.lookupConfidence || "medium",
                    result.isAmbiguousCandidate ? "ambiguous" : null,
                    result.officialEquivalent ? "official equivalent" : "project match",
                    result.lookupMatchReason || "matched",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                    .replace(/-/g, " ")}
                </Text>
              ) : null}
            </View>
            <TagPill label="Select" tone="official" />
          </Pressable>
        ))}
      </View>
      {selectedConstituency ? (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>{selectedConstituency.name}</Text>
          <Text style={styles.selectionText}>{selectedConstituency.summary}</Text>
          <View style={styles.selectionMetaRow}>
            <TagPill label={`${selectedConstituency.seats} seats`} tone="official" />
            <TagPill label={`Updated ${selectedConstituency.updatedAt}`} tone="neutral" />
            {lookupModes.length ? (
              <TagPill label={lookupModes.join(" / ")} tone="neutral" />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  label: {
    color: palette.ink,
    fontSize: typography.h2,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  helper: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.ink,
    fontSize: typography.body,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultList: {
    marginBottom: spacing.sm,
  },
  lookupSummary: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: spacing.xs,
    flex: 1,
  },
  lookupSummaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  lookupActionRow: {
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  selectionHint: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  resultItem: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  resultItemActive: {
    backgroundColor: palette.info,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  resultItemPressed: {
    opacity: 0.72,
  },
  resultMeta: {
    flex: 1,
    marginRight: spacing.sm,
  },
  resultTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
  },
  resultSubtitle: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    marginTop: 2,
  },
  resultLookupMeta: {
    color: palette.civicStrong,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 2,
    textTransform: "capitalize",
  },
  selectionPanel: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  selectionTitle: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 4,
  },
  selectionText: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  selectionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
});
