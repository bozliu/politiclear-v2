import { buildApiUrl } from "./politiclearApi";

import {
  candidates as fallbackCandidates,
  checklistSections as fallbackChecklistSections,
  constituencies as fallbackConstituencies,
  defaultConstituencyId as fallbackDefaultConstituencyId,
  eligibilityFlow as fallbackEligibilityFlow,
  getOfficialResourceLinks as getFallbackOfficialResourceLinks,
  issueCatalog as fallbackIssueCatalog,
  learningPaths as fallbackLearningPaths,
  newsFeed as fallbackNewsFeed,
  parties as fallbackParties,
  stvGuide as fallbackStvGuide,
} from "../data/politiclearData";

const bundledBootstrapSnapshot = require("../../data/generated/politiclear-cache.json");
const bundledEvidenceSnapshot = require("../../data/generated/politiclear-evidence.json");

const UNKNOWN_STANCE = "No verified source yet";
const UNKNOWN_SUMMARY =
  "Politiclear does not have a verified issue summary for this row yet.";
const UNKNOWN_OVERVIEW =
  "Politiclear is keeping this profile conservative until stronger verified issue sourcing is attached.";
const DEFAULT_STALE_AFTER_DAYS = 2;
const DEFAULT_SOURCE_CONFIDENCE = "medium";
const DEFAULT_RELEASE_STAGE = "live";
const DEFAULT_CONTENT_POLICY_VERSION = "2026-03-public-launch-rc1";
const DEFAULT_METHODOLOGY_VERSION = "2026-03-public-launch-rc1";
const DEFAULT_FALLBACK_MODE = "bundled-official-snapshot";

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeMergeKey(name, constituencyName) {
  return `${normalizeText(name)}::${normalizeText(constituencyName)}`;
}

function dedupeBy(items, getKey) {
  const lookup = new Map();

  items.filter(Boolean).forEach((item) => {
    lookup.set(getKey(item), item);
  });

  return Array.from(lookup.values());
}

function dedupeSources(sources = []) {
  return dedupeBy(
    sources.filter((source) => source?.label && source?.url),
    (source) => `${source.label}::${source.url}`
  );
}

function normalizeSource(source, defaults = {}) {
  if (!source?.label || !source?.url) {
    return null;
  }

  const sourceType = source.sourceType || source.type || defaults.sourceType || "official";
  const confidence =
    source.confidence ||
    defaults.confidence ||
    (sourceType === "official" || sourceType === "oireachtas" ? "high" : DEFAULT_SOURCE_CONFIDENCE);

  return {
    confidence,
    isEdited: source.isEdited ?? defaults.isEdited ?? false,
    label: source.label,
    lastUpdated:
      source.lastUpdated ||
      defaults.lastUpdated ||
      new Date().toISOString().slice(0, 10),
    license: source.license || defaults.license || null,
    note: source.note || defaults.note || null,
    editorialNote: source.editorialNote || defaults.editorialNote || null,
    provenance: source.provenance || defaults.provenance || null,
    reviewState: source.reviewState || defaults.reviewState || null,
    sourceType,
    type: sourceType,
    url: source.url,
  };
}

function normalizeSourceType(value = "") {
  const normalized = `${value || ""}`.trim().toLowerCase();

  if (!normalized) {
    return "official";
  }

  if (normalized === "oirechtas") {
    return "oireachtas";
  }

  return normalized;
}

function normalizeSources(sources = [], defaults = {}) {
  return dedupeSources(
    sources
      .map((source) => normalizeSource(source, defaults))
      .filter(Boolean)
  );
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getInitials(value = "") {
  const parts = `${value}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "?";
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function buildUnknownIssues(issueCatalog, candidateName, source) {
  return issueCatalog.map((issue) => ({
    coverageStatus: "unknown",
    issueId: issue.id,
    label: issue.label,
    stance: UNKNOWN_STANCE,
    summary: `${candidateName} does not yet have a verified ${issue.label.toLowerCase()} brief in Politiclear.`,
    evidenceLabel: "No verified source yet",
    source,
  }));
}

function buildCandidateImageUrl(candidateId, imageSource) {
  if (!candidateId || !imageSource) {
    return imageSource || null;
  }

  return buildApiUrl(`/images/candidates/${encodeURIComponent(candidateId)}`);
}

function hasVerifiedIssueRow(issue) {
  return Boolean(
    issue?.coverageStatus === "issueLinked" &&
      issue?.source?.url &&
      issue?.stance &&
      issue.stance !== UNKNOWN_STANCE &&
      issue?.evidenceLabel &&
      issue.evidenceLabel !== "No verified source yet"
  );
}

function getCoverageLabel(issue) {
  if (issue?.coverageStatus === "issueLinked" && issue?.source?.url) {
    return "Linked evidence";
  }

  if (issue?.coverageStatus === "partyLinked" && issue?.source?.url) {
    return "Party source";
  }

  if (issue?.coverageStatus === "officialLinked" && issue?.source?.url) {
    return "Official source";
  }

  return "No verified source yet";
}

function getBestBallotSource(candidate) {
  return (
    candidate?.partyLinks?.[0] ||
    candidate?.officialLinks?.[0] ||
    candidate?.sources?.[0] ||
    null
  );
}

function buildIssueCoverageById(issueCatalog, keyIssues = []) {
  return issueCatalog.reduce((coverage, issue) => {
    const matched = keyIssues.find((candidateIssue) => candidateIssue.issueId === issue.id);
    coverage[issue.id] = hasVerifiedIssueRow(matched);
    return coverage;
  }, {});
}

function countIssueEvidence(issueCoverageById = {}) {
  return Object.values(issueCoverageById).filter(Boolean).length;
}

function buildSummaryBasis(candidate, sourceCount, issueEvidenceCount) {
  if (candidate?.summaryBasis) {
    return candidate.summaryBasis;
  }

  if (issueEvidenceCount > 0) {
    return `Politiclear summary based on ${sourceCount} attached sources, including issue-linked public records.`;
  }

  if (candidate?.profileKind === "electionCandidate") {
    return `Politiclear summary based on ${sourceCount} attached sources, primarily official ballot and party-linked records.`;
  }

  return `Politiclear summary based on ${sourceCount} attached sources, with visible unknowns where issue-linked evidence is still missing.`;
}

function buildCoverageNote(issueCatalog, issueCoverageById = {}) {
  return `Issue-linked evidence currently covers ${countIssueEvidence(
    issueCoverageById
  )} of ${issueCatalog.length} tracked issues.`;
}

function buildCompareKey(candidate, fallback, constituency) {
  const memberCode = candidate.memberCode || fallback?.memberCode || null;
  if (memberCode) {
    return `person::${normalizeText(memberCode)}`;
  }

  const constituencyName =
    candidate.constituencyName || constituency?.name || fallback?.constituencyName || "";
  const mergeKey = makeMergeKey(candidate.name || fallback?.name || "", constituencyName);

  return mergeKey ? `person::${mergeKey}` : `person::${normalizeText(candidate.id || fallback?.id || "")}`;
}

function deriveSyncStatus(meta = {}) {
  const lastUpdated = `${meta.lastUpdated || ""}`.trim();
  const staleAfterDays = Number(meta.staleAfterDays || DEFAULT_STALE_AFTER_DAYS);

  if (!lastUpdated) {
    return "unknown";
  }

  const lastUpdatedDate = new Date(`${lastUpdated}T00:00:00Z`);
  if (Number.isNaN(lastUpdatedDate.getTime())) {
    return "unknown";
  }

  const ageInDays = Math.floor(
    (Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (ageInDays > staleAfterDays) {
    return "stale";
  }

  return meta.syncStatus || "synced";
}

function findBundledCandidateRecord(candidateId, baseCandidate = null) {
  const normalizedCandidateId = normalizeText(candidateId);
  const requestedMergeKey = baseCandidate
    ? makeMergeKey(baseCandidate.name, baseCandidate.constituencyName || "")
    : null;

  return (bundledBootstrapSnapshot?.candidates || []).find((candidate) => {
    if (!candidate) {
      return false;
    }

    const normalizedBundledId = normalizeText(candidate.id);

    if (
      candidate.id === candidateId ||
      normalizedBundledId === normalizedCandidateId ||
      normalizedBundledId.startsWith(normalizedCandidateId)
    ) {
      return true;
    }

    if (
      baseCandidate?.memberCode &&
      candidate.memberCode &&
      normalizeText(candidate.memberCode) === normalizeText(baseCandidate.memberCode)
    ) {
      return true;
    }

    if (requestedMergeKey) {
      return (
        makeMergeKey(candidate.name, candidate.constituencyName || "") ===
        requestedMergeKey
      );
    }

    return false;
  });
}

function ensureConstituencyShape(constituency, officialResources, fallbackLookup) {
  const fallback = fallbackLookup.get(constituency.id);
  const officialLinks = dedupeSources([
    ...(constituency.officialLinks || []),
    ...(fallback?.officialLinks || []),
    ...officialResources.slice(0, 2),
  ]);

  return {
    bbox: constituency.bbox || fallback?.bbox || null,
    boundary: constituency.boundary || fallback?.boundary || null,
    centroid: constituency.centroid || fallback?.centroid || null,
    id: constituency.id,
    mapLabelPoint:
      constituency.mapLabelPoint || fallback?.mapLabelPoint || null,
    name: constituency.name,
    seats: constituency.seats || fallback?.seats || 0,
    summary:
      constituency.summary ||
      fallback?.summary ||
      `${constituency.name} constituency profile synced from official data sources.`,
    localIssues:
      constituency.localIssues?.length
        ? constituency.localIssues
        : fallback?.localIssues?.length
          ? fallback.localIssues
          : ["Public services", "Housing", "Local representation"],
    searchTerms:
      constituency.searchTerms?.length
        ? constituency.searchTerms
        : fallback?.searchTerms?.length
          ? fallback.searchTerms
          : [constituency.name],
    updatedAt: constituency.updatedAt || fallback?.updatedAt || new Date().toISOString().slice(0, 10),
    officialLinks,
  };
}

function ensureCandidateShape(candidate, issueCatalog, constituencyLookup, fallbackByMergeKey) {
  const constituency = constituencyLookup.get(candidate.constituencyId);
  const mergeKey = makeMergeKey(
    candidate.name,
    candidate.constituencyName || constituency?.name || ""
  );
  const fallback = fallbackByMergeKey.get(mergeKey);
  const officialSource =
    candidate.officialLinks?.[0] ||
    fallback?.officialLinks?.[0] ||
    candidate.sources?.[0] ||
    null;

  const apiKeyIssues = candidate.keyIssues?.length ? candidate.keyIssues : [];
  const fallbackKeyIssues = fallback?.keyIssues?.length ? fallback.keyIssues : [];
  const keyIssues =
    apiKeyIssues.some(hasVerifiedIssueRow)
      ? apiKeyIssues
      : fallbackKeyIssues.some(hasVerifiedIssueRow)
        ? fallbackKeyIssues
        : apiKeyIssues.length
          ? apiKeyIssues
          : buildUnknownIssues(
              issueCatalog,
              candidate.name,
              officialSource
            );
  const issueCoverageById = buildIssueCoverageById(issueCatalog, keyIssues);
  const issueEvidenceCount = countIssueEvidence(issueCoverageById);
  const compareKey = buildCompareKey(candidate, fallback, constituency);

  const activity =
    candidate.activity?.length
      ? candidate.activity
      : fallback?.activity?.length
        ? fallback.activity
        : officialSource
          ? [
              {
                title: "Official profile",
                summary:
                  "Use the linked official parliamentary or civic source as the primary record while Politiclear expands this profile.",
                source: officialSource,
              },
            ]
          : [];

  const sources = normalizeSources([
    ...(candidate.sources || []),
    ...(candidate.officialLinks || []),
    ...(fallback?.sources || []),
    ...(fallback?.officialLinks || []),
    ...keyIssues.map((issue) => issue.source),
    ...activity.map((entry) => entry.source),
  ], {
    lastUpdated:
      candidate.lastUpdated || fallback?.lastUpdated || new Date().toISOString().slice(0, 10),
  });

  const officialLinks = normalizeSources([
    ...(candidate.officialLinks || []),
    ...(fallback?.officialLinks || []),
  ]);

  const partyLinks = normalizeSources([
    ...(candidate.partyLinks || []),
    ...(fallback?.partyLinks || []),
  ]);

  return {
    id: candidate.id || fallback?.id,
    name: candidate.name,
    party: candidate.party || fallback?.party || "Unknown",
    partyId: candidate.partyId || fallback?.partyId || "pending",
    constituencyId: candidate.constituencyId,
    constituencyName:
      candidate.constituencyName || constituency?.name || fallback?.constituencyName || "Unknown",
    isIncumbent:
      candidate.isIncumbent !== undefined
        ? candidate.isIncumbent
        : fallback?.isIncumbent ?? true,
    lastUpdated:
      candidate.lastUpdated || fallback?.lastUpdated || new Date().toISOString().slice(0, 10),
    summary:
      fallback?.summary ||
      candidate.summary ||
      `${candidate.party || "Public"} profile for ${
        candidate.constituencyName || constituency?.name || "this constituency"
      }. Detailed issue verification is still in progress.`,
    overview: fallback?.overview || candidate.overview || UNKNOWN_OVERVIEW,
    sourceNote:
      fallback?.sourceNote ||
      candidate.sourceNote ||
      "Review the official source trail before treating this summary as complete. Unknowns remain visible by design.",
    statusLabel:
      fallback?.statusLabel ||
      candidate.statusLabel ||
      (candidate.profileKind === "electionCandidate"
        ? "2024 ballot candidate"
        : "Current TD"),
    evidenceCounts: candidate.evidenceCounts || fallback?.evidenceCounts || null,
    evidenceStatus:
      candidate.evidenceStatus ||
      fallback?.evidenceStatus ||
      "summaryOnly",
    coverageNote:
      candidate.coverageNote ||
      fallback?.coverageNote ||
      buildCoverageNote(issueCatalog, issueCoverageById),
    evidenceCoverage:
      candidate.evidenceCoverage ||
      fallback?.evidenceCoverage ||
      (issueEvidenceCount > 0
        ? `Issue-linked coverage on ${issueEvidenceCount} topics`
        : candidate.profileKind === "electionCandidate"
          ? "Official ballot record only"
          : "Profile evidence only"),
    electedLabel:
      candidate.electedLabel || fallback?.electedLabel || null,
    firstPreferenceVotes:
      candidate.firstPreferenceVotes ?? fallback?.firstPreferenceVotes ?? null,
    gender: candidate.gender || fallback?.gender || null,
    imageUrl: buildCandidateImageUrl(
      candidate.id || fallback?.id,
      candidate.sourceImageUrl ||
        fallback?.sourceImageUrl ||
        candidate.imageUrl ||
        fallback?.imageUrl ||
        candidate.portraitPath ||
        fallback?.portraitPath ||
        null
    ),
    sourceImageUrl:
      candidate.sourceImageUrl ||
      fallback?.sourceImageUrl ||
      candidate.imageUrl ||
      fallback?.imageUrl ||
      candidate.portraitPath ||
      fallback?.portraitPath ||
      null,
    imageFallbackLabel:
      candidate.imageFallbackLabel ||
      fallback?.imageFallbackLabel ||
      getInitials(candidate.name),
    issueCoverageById,
    issueEvidenceCount,
    isOutgoingMember:
      candidate.isOutgoingMember !== undefined
        ? candidate.isOutgoingMember
        : fallback?.isOutgoingMember ?? false,
    keyIssues,
    memberCode: candidate.memberCode || fallback?.memberCode || null,
    memberUri: candidate.memberUri || fallback?.memberUri || null,
    offices: candidate.offices || fallback?.offices || [],
    partyLinks,
    portraitDeliveryMode:
      candidate.portraitDeliveryMode ||
      fallback?.portraitDeliveryMode ||
      null,
    portraitPath:
      candidate.portraitPath ||
      fallback?.portraitPath ||
      null,
    portraitResolutionState:
      candidate.portraitResolutionState ||
      fallback?.portraitResolutionState ||
      "unresolved",
    portraitSourceDomain:
      candidate.portraitSourceDomain ||
      fallback?.portraitSourceDomain ||
      null,
    portraitSourcePageUrl:
      candidate.portraitSourcePageUrl ||
      fallback?.portraitSourcePageUrl ||
      null,
    portraitSourceType:
      candidate.portraitSourceType ||
      fallback?.portraitSourceType ||
      null,
    portraitSourceUrl:
      candidate.portraitSourceUrl ||
      fallback?.portraitSourceUrl ||
      null,
    profileKind:
      candidate.profileKind ||
      fallback?.profileKind ||
      "currentRepresentative",
    profileUrl: candidate.profileUrl || fallback?.profileUrl || null,
    recentDebates: candidate.recentDebates || fallback?.recentDebates || [],
    recentQuestions: candidate.recentQuestions || fallback?.recentQuestions || [],
    recentVotes: candidate.recentVotes || fallback?.recentVotes || [],
    committees: candidate.committees || fallback?.committees || [],
    compareKey,
    activity,
    officialLinks,
    provenanceSummary:
      candidate.provenanceSummary ||
      fallback?.provenanceSummary ||
      (issueEvidenceCount > 0
        ? "Issue rows include verified public-record evidence."
        : candidate.profileKind === "electionCandidate"
          ? "This profile currently relies on official ballot and party-linked sources."
          : "This profile is visible, but stronger issue-linked evidence is still being attached."),
    sources,
    sourceCount: sources.length,
    summaryBasis: buildSummaryBasis(candidate, sources.length, issueEvidenceCount),
    transparencyLabels:
      issueEvidenceCount > 0
        ? ["fact", "source-linked", "public-record"]
        : candidate.profileKind === "electionCandidate"
          ? ["official-record", "party-source", "unknowns-visible"]
          : ["summary", "unknowns-visible"],
  };
}

function ensureNewsShape(newsItem, constituencyLookup) {
  const constituencyIds = newsItem.constituencyIds?.length
    ? newsItem.constituencyIds
    : newsItem.constituencyId
      ? [newsItem.constituencyId]
      : [];

  const sourceType = normalizeSourceType(newsItem.sourceType || "official");
  const editorialNote =
    newsItem.editorialNote ||
    newsItem.provenanceNote ||
    (sourceType === "official"
      ? "Official source-linked update rendered without Politiclear editorial rewriting."
      : null);
  const reviewState =
    newsItem.reviewState ||
    (sourceType === "official" ? "official-record" : null);
  const provenance =
    newsItem.provenance ||
    (sourceType === "official"
      ? "Official public record"
      : editorialNote
        ? "Politiclear-reviewed brief"
        : null);

  return {
    ...newsItem,
    constituencyIds,
    constituencyId: newsItem.constituencyId || constituencyIds[0] || null,
    editorialNote,
    provenance,
    reviewState,
    issueTags: newsItem.issueTags || newsItem.tags || [],
    lastUpdated:
      newsItem.lastUpdated || new Date().toISOString().slice(0, 10),
    relevanceReason:
      newsItem.relevanceReason ||
      newsItem.whyItMatters ||
      (constituencyIds[0] && constituencyLookup.get(constituencyIds[0])
        ? `This helps anchor ${constituencyLookup.get(constituencyIds[0]).name} in a verified public source.`
        : "This keeps the local ballot connected to a source-linked public record."),
    source:
      newsItem.source ||
      normalizeSource(
        newsItem.sourceLabel && newsItem.url
          ? {
              label: newsItem.sourceLabel,
              lastUpdated: newsItem.lastUpdated,
              provenance,
              reviewState,
              sourceType,
              editorialNote,
              url: newsItem.url,
            }
          : null
      ),
    sourceLabel: newsItem.sourceLabel || newsItem.source?.label || "Source pending",
    sourceType,
    tags: newsItem.issueTags || newsItem.tags || [],
    whyItMatters:
      newsItem.whyItMatters ||
      (constituencyIds[0] && constituencyLookup.get(constituencyIds[0])
        ? `This helps anchor ${constituencyLookup.get(constituencyIds[0]).name} in a verified public source.`
        : "This keeps the local ballot connected to a source-linked public record."),
  };
}

function isRenderableNewsItem(item) {
  if (
    !item?.id ||
    !item?.title ||
    !item?.summary ||
    !item?.url ||
    !item?.sourceLabel ||
    !item?.sourceType ||
    !item?.publishedAt ||
    !item?.lastUpdated ||
    !item?.whyItMatters
  ) {
    return false;
  }

  if (item.sourceType !== "official" && !item.editorialNote) {
    return false;
  }

  if (item.sourceType !== "official" && (!item.provenance || !item.reviewState)) {
    return false;
  }

  return true;
}

function objectValuesParties() {
  return Object.values(fallbackParties).map((party) => ({
    id: party.id,
    name: party.name,
    shortLabel: party.shortLabel,
    officialLinks: party.officialLinks || [],
  }));
}

function createSampleDataset() {
  return finalizeDataset(
    {
      candidates: cloneJson(fallbackCandidates),
      currentRepresentatives: cloneJson(fallbackCandidates),
      checklistSections: cloneJson(fallbackChecklistSections),
      constituencies: cloneJson(fallbackConstituencies),
      defaultConstituencyId: fallbackDefaultConstituencyId,
      electionCandidates: [],
      eligibilityFlow: cloneJson(fallbackEligibilityFlow),
      issueCatalog: cloneJson(fallbackIssueCatalog),
      lookupModes: ["constituency", "town", "address", "eircode"],
      learningPaths: cloneJson(fallbackLearningPaths),
      newsFeed: cloneJson(fallbackNewsFeed),
      officialResources: cloneJson(getFallbackOfficialResourceLinks()),
      parties: cloneJson(objectValuesParties()),
      stvGuide: cloneJson(fallbackStvGuide),
    },
    {
      label: "Sample fallback data",
      mode: "fallback",
      lastUpdated: new Date().toISOString().slice(0, 10),
      staleAfterDays: DEFAULT_STALE_AFTER_DAYS,
    }
  );
}

function finalizeDataset(rawDataset, metaOverrides = {}) {
  const officialResources = dedupeSources(
    rawDataset.officialResources || getFallbackOfficialResourceLinks()
  );
  const fallbackConstituencyLookup = new Map(
    fallbackConstituencies.map((constituency) => [constituency.id, constituency])
  );

  const constituencies = dedupeBy(
    (rawDataset.constituencies || fallbackConstituencies).map((constituency) =>
      ensureConstituencyShape(constituency, officialResources, fallbackConstituencyLookup)
    ),
    (constituency) => constituency.id
  ).sort((left, right) => left.name.localeCompare(right.name));

  const constituencyLookup = new Map(
    constituencies.map((constituency) => [constituency.id, constituency])
  );

  const fallbackByMergeKey = new Map(
    fallbackCandidates.map((candidate) => [
      makeMergeKey(candidate.name, candidate.constituencyName),
      candidate,
    ])
  );

  const issueCatalog = rawDataset.issueCatalog || fallbackIssueCatalog;

  const currentRepresentatives = dedupeBy(
    (rawDataset.currentRepresentatives || rawDataset.candidates || fallbackCandidates).map((candidate) =>
      ensureCandidateShape(candidate, issueCatalog, constituencyLookup, fallbackByMergeKey)
    ),
    (candidate) => candidate.id
  );

  const electionCandidates = dedupeBy(
    (rawDataset.electionCandidates || []).map((candidate) =>
      ensureCandidateShape(candidate, issueCatalog, constituencyLookup, fallbackByMergeKey)
    ),
    (candidate) => candidate.id
  );

  const newsFeed = dedupeBy(
    (rawDataset.newsFeed || fallbackNewsFeed).map((item) =>
      ensureNewsShape(item, constituencyLookup)
    ),
    (item) => item.id
  )
    .filter(isRenderableNewsItem)
    .sort((left, right) => `${right.publishedAt}`.localeCompare(`${left.publishedAt}`));

  const dataset = {
    meta: {
      mode: metaOverrides.mode || rawDataset.meta?.mode || "fallback",
      label:
        metaOverrides.label || rawDataset.meta?.label || "Sample fallback data",
      lastUpdated:
        metaOverrides.lastUpdated ||
        rawDataset.meta?.lastUpdated ||
        new Date().toISOString().slice(0, 10),
      generatedAt:
        metaOverrides.generatedAt ||
        rawDataset.meta?.generatedAt ||
        new Date().toISOString(),
      staleAfterDays:
        metaOverrides.staleAfterDays ||
        rawDataset.meta?.staleAfterDays ||
        DEFAULT_STALE_AFTER_DAYS,
      releaseStage:
        metaOverrides.releaseStage ||
        rawDataset.meta?.releaseStage ||
        DEFAULT_RELEASE_STAGE,
      contentPolicyVersion:
        metaOverrides.contentPolicyVersion ||
        rawDataset.meta?.contentPolicyVersion ||
        DEFAULT_CONTENT_POLICY_VERSION,
      methodologyVersion:
        metaOverrides.methodologyVersion ||
        rawDataset.meta?.methodologyVersion ||
        DEFAULT_METHODOLOGY_VERSION,
      fallbackMode:
        metaOverrides.fallbackMode ||
        rawDataset.meta?.fallbackMode ||
        DEFAULT_FALLBACK_MODE,
      releaseStageLabel:
        (metaOverrides.releaseStage ||
          rawDataset.meta?.releaseStage ||
          DEFAULT_RELEASE_STAGE) === "live"
          ? "Live service"
          : "Public beta",
      syncStatus: deriveSyncStatus({
        ...rawDataset.meta,
        ...metaOverrides,
      }),
      error: metaOverrides.error || null,
      monitoring:
        metaOverrides.monitoring ||
        rawDataset.meta?.monitoring ||
        {
          alertState: "normal",
          countsByType: {},
          incidentsLast24h: 0,
          latestIncident: null,
          thresholdExceeded: [],
          thresholds: {},
        },
    },
    boundarySource: rawDataset.boundarySource || null,
    candidates: currentRepresentatives,
    checklistSections:
      rawDataset.checklistSections || fallbackChecklistSections,
    constituencies,
    coverage:
      rawDataset.coverage || {
        currentRepresentatives: currentRepresentatives.length,
        electionCandidates: electionCandidates.length,
        issueLinkedProfiles: currentRepresentatives.filter(
          (candidate) => candidate.issueEvidenceCount > 0
        ).length,
      },
    currentRepresentatives,
    defaultConstituencyId:
      rawDataset.defaultConstituencyId ||
      fallbackDefaultConstituencyId ||
      constituencies[0]?.id ||
      null,
    electionCandidates,
    eligibilityFlow: rawDataset.eligibilityFlow || fallbackEligibilityFlow,
    issueCatalog,
    lookupPrecisionCapabilities:
      rawDataset.lookupPrecisionCapabilities || {
        address: "official-handoff-or-best-match-locality",
        constituency: "exact-name",
        eircode: "routing-key",
        town: "best-match-locality",
      },
    lookupModes:
      rawDataset.lookupModes || ["constituency", "town", "address", "eircode"],
    learningPaths: rawDataset.learningPaths || fallbackLearningPaths,
    newsFeed,
    officialResources,
    parties: rawDataset.parties || objectValuesParties(),
    stvGuide: rawDataset.stvGuide || fallbackStvGuide,
  };

  return dataset;
}

export function createFallbackDataset() {
  try {
    return finalizeDataset(cloneJson(bundledBootstrapSnapshot), {
      generatedAt:
        bundledBootstrapSnapshot.meta?.generatedAt || new Date().toISOString(),
      label: "Bundled official snapshot",
      lastUpdated:
        bundledBootstrapSnapshot.meta?.lastUpdated ||
        new Date().toISOString().slice(0, 10),
      mode: "bundled",
      releaseStage:
        bundledBootstrapSnapshot.meta?.releaseStage || DEFAULT_RELEASE_STAGE,
      staleAfterDays:
        bundledBootstrapSnapshot.meta?.staleAfterDays || DEFAULT_STALE_AFTER_DAYS,
    });
  } catch (error) {
    return createSampleDataset();
  }
}

export function mergeDatasetWithFallback(apiDataset) {
  if (!apiDataset) {
    return createFallbackDataset();
  }

  const fallback = createFallbackDataset();
  const merged = finalizeDataset(
    {
      ...apiDataset,
      candidates: [
        ...fallback.candidates,
        ...(apiDataset.candidates || []),
      ],
      currentRepresentatives: [
        ...fallback.currentRepresentatives,
        ...(apiDataset.currentRepresentatives || apiDataset.candidates || []),
      ],
      constituencies: [
        ...fallback.constituencies,
        ...(apiDataset.constituencies || []),
      ],
      electionCandidates: [
        ...fallback.electionCandidates,
        ...(apiDataset.electionCandidates || []),
      ],
      newsFeed: [
        ...fallback.newsFeed,
        ...(apiDataset.newsFeed || []),
      ],
      officialResources: [
        ...fallback.officialResources,
        ...(apiDataset.officialResources || []),
      ],
      checklistSections:
        apiDataset.checklistSections || fallback.checklistSections,
      eligibilityFlow:
        apiDataset.eligibilityFlow || fallback.eligibilityFlow,
      learningPaths: apiDataset.learningPaths || fallback.learningPaths,
      stvGuide: apiDataset.stvGuide || fallback.stvGuide,
      issueCatalog: apiDataset.issueCatalog || fallback.issueCatalog,
      lookupPrecisionCapabilities:
        apiDataset.lookupPrecisionCapabilities || fallback.lookupPrecisionCapabilities,
      lookupModes: apiDataset.lookupModes || fallback.lookupModes,
      parties: apiDataset.parties || fallback.parties,
      defaultConstituencyId:
        apiDataset.defaultConstituencyId || fallback.defaultConstituencyId,
      coverage: apiDataset.coverage || fallback.coverage,
    },
    {
      label: "API sync + bundled civic snapshot",
      mode: "api",
      lastUpdated:
        apiDataset.meta?.lastUpdated || new Date().toISOString().slice(0, 10),
      generatedAt: apiDataset.meta?.generatedAt || new Date().toISOString(),
      releaseStage: apiDataset.meta?.releaseStage || DEFAULT_RELEASE_STAGE,
      staleAfterDays:
        apiDataset.meta?.staleAfterDays ||
        fallback.meta?.staleAfterDays ||
        DEFAULT_STALE_AFTER_DAYS,
      syncStatus: apiDataset.meta?.syncStatus || "synced",
      error: apiDataset.meta?.error || null,
    }
  );

  return merged;
}

export function getBundledCandidateDetail(candidateId, baseCandidate = null) {
  const bundledCandidate = findBundledCandidateRecord(candidateId, baseCandidate);
  const detail =
    bundledEvidenceSnapshot?.candidateDetails?.[bundledCandidate?.id || candidateId];

  return detail ? cloneJson(detail) : null;
}

export function findConstituencies(dataset, query = "") {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return dataset.constituencies;
  }

  return dataset.constituencies.filter((constituency) => {
    const haystack = [
      constituency.name,
      constituency.summary,
      ...(constituency.localIssues || []),
      ...(constituency.searchTerms || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function getConstituencyById(dataset, constituencyId) {
  return (
    dataset.constituencies.find((constituency) => constituency.id === constituencyId) ||
    dataset.constituencies[0] ||
    null
  );
}

export function getCandidatesForConstituency(dataset, constituencyId) {
  return dataset.currentRepresentatives.filter(
    (candidate) => candidate.constituencyId === constituencyId
  );
}

export function getElectionCandidatesForConstituency(dataset, constituencyId) {
  return dataset.electionCandidates.filter(
    (candidate) => candidate.constituencyId === constituencyId
  );
}

export function getCandidateById(dataset, candidateId) {
  return (
    [...dataset.currentRepresentatives, ...dataset.electionCandidates].find(
      (candidate) => candidate.id === candidateId
    ) || null
  );
}

function getCandidateByCompareKey(dataset, compareKey) {
  if (!compareKey) {
    return null;
  }

  const currentRepresentative = dataset.currentRepresentatives.find(
    (candidate) => candidate.compareKey === compareKey
  );

  if (currentRepresentative) {
    return currentRepresentative;
  }

  return (
    dataset.electionCandidates.find((candidate) => candidate.compareKey === compareKey) ||
    getCandidateById(dataset, compareKey)
  );
}

export function getCompareCandidates(dataset, candidateIds = []) {
  const selectedCandidates = candidateIds
    .map((candidateId) => getCandidateByCompareKey(dataset, candidateId))
    .filter(Boolean);

  const rows = dataset.issueCatalog.map((issue) => ({
    issueId: issue.id,
    label: issue.label,
    prompt: issue.prompt,
    cells: selectedCandidates.map((candidate) => {
      const position = candidate.keyIssues.find(
        (candidateIssue) => candidateIssue.issueId === issue.id
      );
      const fallbackBallotSource =
        position?.coverageStatus && position.coverageStatus !== "unknown"
          ? null
          : getBestBallotSource(candidate);
      const fallbackCoverageLabel = fallbackBallotSource
        ? fallbackBallotSource.sourceType === "party"
          ? "Party source"
          : "Official source"
        : "No verified source yet";

      return {
        candidateId: candidate.id,
        coverageLabel:
          getCoverageLabel(position) === "No verified source yet"
            ? fallbackCoverageLabel
            : getCoverageLabel(position),
        evidenceLabel:
          position?.evidenceLabel ||
          fallbackBallotSource?.label ||
          UNKNOWN_STANCE,
        source:
          position?.coverageStatus && position?.coverageStatus !== "unknown"
            ? position?.source || null
            : fallbackBallotSource,
        stance:
          position?.stance ||
          (fallbackBallotSource ? "No issue-specific record yet" : UNKNOWN_STANCE),
        summary:
          position?.summary ||
          (fallbackBallotSource
            ? `${candidate.name} currently has ${
                fallbackBallotSource.sourceType === "party" ? "party" : "official"
              } source coverage for this profile, but not a verified issue-specific record for ${issue.label.toLowerCase()}.`
            : UNKNOWN_SUMMARY),
      };
    }),
  }));

  return {
    candidates: selectedCandidates,
    rows,
  };
}

export function mergeCandidateDetail(baseCandidate, detailCandidate) {
  if (!baseCandidate) {
    return null;
  }

  if (!detailCandidate) {
    return baseCandidate;
  }

  const merged = {
    ...baseCandidate,
    ...detailCandidate,
  };

  merged.committees = detailCandidate.committees || baseCandidate.committees || [];
  merged.offices = detailCandidate.offices || baseCandidate.offices || [];
  merged.keyIssues =
    detailCandidate.keyIssues?.length
      ? detailCandidate.keyIssues
      : baseCandidate.keyIssues || [];
  merged.recentQuestions =
    detailCandidate.recentQuestions || baseCandidate.recentQuestions || [];
  merged.recentDebates =
    detailCandidate.recentDebates || baseCandidate.recentDebates || [];
  merged.recentVotes =
    detailCandidate.recentVotes || baseCandidate.recentVotes || [];
  merged.sourceImageUrl =
    detailCandidate.sourceImageUrl ||
    detailCandidate.portraitSourceUrl ||
    detailCandidate.imageUrl ||
    detailCandidate.portraitPath ||
    baseCandidate.sourceImageUrl ||
    baseCandidate.portraitSourceUrl ||
    baseCandidate.imageUrl ||
    baseCandidate.portraitPath ||
    null;
  merged.portraitDeliveryMode =
    detailCandidate.portraitDeliveryMode ||
    baseCandidate.portraitDeliveryMode ||
    null;
  merged.portraitPath =
    detailCandidate.portraitPath ||
    baseCandidate.portraitPath ||
    null;
  merged.portraitResolutionState =
    detailCandidate.portraitResolutionState ||
    baseCandidate.portraitResolutionState ||
    "unresolved";
  merged.portraitSourceDomain =
    detailCandidate.portraitSourceDomain ||
    baseCandidate.portraitSourceDomain ||
    null;
  merged.portraitSourcePageUrl =
    detailCandidate.portraitSourcePageUrl ||
    baseCandidate.portraitSourcePageUrl ||
    null;
  merged.portraitSourceType =
    detailCandidate.portraitSourceType ||
    baseCandidate.portraitSourceType ||
    null;
  merged.portraitSourceUrl =
    detailCandidate.portraitSourceUrl ||
    baseCandidate.portraitSourceUrl ||
    merged.sourceImageUrl ||
    null;
  merged.imageUrl = buildCandidateImageUrl(
    merged.id,
    merged.sourceImageUrl
  );
  merged.partyLinks = dedupeSources([
    ...normalizeSources(baseCandidate.partyLinks || []),
    ...normalizeSources(detailCandidate.partyLinks || []),
  ]);
  merged.officialLinks = dedupeSources([
    ...normalizeSources(baseCandidate.officialLinks || []),
    ...normalizeSources(detailCandidate.officialLinks || []),
  ]);
  merged.sources = dedupeSources([
    ...normalizeSources(baseCandidate.sources || []),
    ...normalizeSources(detailCandidate.sources || []),
    ...(merged.officialLinks || []),
    ...(merged.partyLinks || []),
    ...(merged.keyIssues || []).map((entry) => entry.source),
    ...(merged.committees || []).map((entry) => entry.source),
    ...(merged.offices || []).map((entry) => entry.source),
    ...(merged.recentQuestions || []).map((entry) => entry.source),
    ...(merged.recentDebates || []).map((entry) => entry.source),
    ...(merged.recentVotes || []).map((entry) => entry.source),
  ]);
  merged.sourceCount = merged.sources.length;
  merged.evidenceCounts = detailCandidate.evidenceCounts || baseCandidate.evidenceCounts;
  merged.evidenceStatus =
    detailCandidate.evidenceStatus ||
    baseCandidate.evidenceStatus ||
    "summaryOnly";
  merged.issueCoverageById =
    detailCandidate.issueCoverageById ||
    baseCandidate.issueCoverageById ||
    buildIssueCoverageById(baseCandidate.issueCatalog || fallbackIssueCatalog, merged.keyIssues);
  merged.issueEvidenceCount =
    detailCandidate.issueEvidenceCount ||
    baseCandidate.issueEvidenceCount ||
    countIssueEvidence(merged.issueCoverageById);
  merged.coverageNote =
    detailCandidate.coverageNote ||
    baseCandidate.coverageNote ||
    buildCoverageNote(merged.keyIssues?.length ? merged.keyIssues : fallbackIssueCatalog, merged.issueCoverageById);
  merged.profileKind =
    detailCandidate.profileKind ||
    baseCandidate.profileKind ||
    "currentRepresentative";
  merged.evidenceCoverage =
    detailCandidate.evidenceCoverage ||
    baseCandidate.evidenceCoverage ||
    (merged.issueEvidenceCount > 0
      ? `Issue-linked coverage on ${merged.issueEvidenceCount} topics`
      : "Profile evidence only");
  merged.provenanceSummary =
    detailCandidate.provenanceSummary ||
    baseCandidate.provenanceSummary ||
    (merged.issueEvidenceCount > 0
      ? "Issue rows include verified public-record evidence."
      : merged.profileKind === "electionCandidate"
        ? "This profile currently relies on official ballot and party-linked sources."
        : "This profile is visible, but stronger issue-linked evidence is still being attached.");
  merged.summaryBasis =
    detailCandidate.summaryBasis ||
    baseCandidate.summaryBasis ||
    buildSummaryBasis(merged, merged.sourceCount, merged.issueEvidenceCount);
  merged.transparencyLabels =
    detailCandidate.transparencyLabels ||
    baseCandidate.transparencyLabels ||
    (merged.issueEvidenceCount > 0
      ? ["fact", "source-linked", "public-record"]
      : merged.profileKind === "electionCandidate"
        ? ["official-record", "party-source", "unknowns-visible"]
        : ["summary", "unknowns-visible"]);
  merged.imageFallbackLabel =
    detailCandidate.imageFallbackLabel ||
    baseCandidate.imageFallbackLabel ||
    getInitials(merged.name);

  return merged;
}

export function getNewsFeed(dataset, constituencyId) {
  if (!constituencyId) {
    return dataset.newsFeed;
  }

  return dataset.newsFeed.filter((item) =>
    item.constituencyIds.includes(constituencyId)
  );
}

export function getFeaturedUpdates(dataset, constituencyId, limit = 3) {
  return getNewsFeed(dataset, constituencyId).slice(0, limit);
}

export function getOfficialResourceLinks(dataset) {
  return dataset.officialResources;
}

export function getDataStatus(dataset) {
  return dataset.meta;
}
