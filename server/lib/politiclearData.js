const fs = require("fs");
const path = require("path");
const {
  LOOKUP_PRECISION_CAPABILITIES,
  lookupConstituencies,
} = require("./constituencyLookup");

const GENERATED_DIR = path.join(__dirname, "..", "..", "data", "generated");
const BOOTSTRAP_PATH = path.join(GENERATED_DIR, "politiclear-cache.json");
const DETAILS_PATH = path.join(GENERATED_DIR, "politiclear-evidence.json");
const PORTRAITS_DIR = path.join(GENERATED_DIR, "portraits");

const UNKNOWN_STANCE = "No verified source yet";
const UNKNOWN_SUMMARY =
  "Politiclear does not have a verified issue summary for this row yet.";
const DEFAULT_STALE_AFTER_DAYS = 2;
const DEFAULT_RELEASE_STAGE = "live";
const CONTENT_POLICY_VERSION = "2026-03-public-launch-rc1";
const METHODOLOGY_VERSION = "2026-03-public-launch-rc1";

function getBestBallotSource(candidate) {
  return (
    candidate?.partyLinks?.[0] ||
    candidate?.officialLinks?.[0] ||
    candidate?.sources?.[0] ||
    null
  );
}

function getCompareCell(candidate, issue) {
  const position = (candidate.keyIssues || []).find(
    (candidateIssue) => candidateIssue.issueId === issue.id
  );
  const evidenceKnown =
    Boolean(position?.source?.url) &&
    position?.coverageStatus === "issueLinked" &&
    position?.stance !== UNKNOWN_STANCE &&
    position?.evidenceLabel !== UNKNOWN_STANCE;
  const partyKnown =
    Boolean(position?.source?.url) &&
    position?.coverageStatus === "partyLinked";
  const officialKnown =
    Boolean(position?.source?.url) &&
    position?.coverageStatus === "officialLinked";
  const fallbackBallotSource =
    !evidenceKnown && !partyKnown && !officialKnown
      ? getBestBallotSource(candidate)
      : null;
  const fallbackCoverageLabel = fallbackBallotSource
    ? fallbackBallotSource.type === "party"
      ? "Party source"
      : "Official source"
    : "No verified source yet";

  return {
    candidateId: candidate.id,
    coverageLabel: evidenceKnown
      ? "Linked evidence"
      : partyKnown
        ? "Party source"
        : officialKnown
          ? "Official source"
          : fallbackCoverageLabel,
    evidenceLabel:
      position?.evidenceLabel ||
      fallbackBallotSource?.label ||
      UNKNOWN_STANCE,
    source:
      evidenceKnown || partyKnown || officialKnown
        ? position?.source || null
        : fallbackBallotSource,
    stance:
      position?.stance ||
      (fallbackBallotSource
        ? "No issue-specific record yet"
        : UNKNOWN_STANCE),
    summary:
      position?.summary ||
      (fallbackBallotSource
        ? `${candidate.name} currently has ${
            fallbackBallotSource.type === "party" ? "party" : "official"
          } source coverage for this profile, but not a verified issue-specific record for ${issue.label.toLowerCase()}.`
        : UNKNOWN_SUMMARY),
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadBundle() {
  const bootstrap = readJson(BOOTSTRAP_PATH);
  let details = { candidateDetails: {}, meta: {} };

  if (fs.existsSync(DETAILS_PATH)) {
    details = readJson(DETAILS_PATH);
  }

  return {
    bootstrap,
    details,
  };
}

function normalizeText(value = "") {
  return `${value}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dedupeSources(sources = []) {
  const seen = new Map();

  sources
    .filter((source) => source?.label && source?.url)
    .forEach((source) => {
      seen.set(`${source.label}::${source.url}`, source);
    });

  return Array.from(seen.values());
}

function getBootstrapCandidatePools(bootstrap) {
  return {
    currentRepresentatives:
      bootstrap.currentRepresentatives || bootstrap.candidates || [],
    electionCandidates: bootstrap.electionCandidates || [],
  };
}

function getCandidates(bootstrap, constituencyId, type = "current-representative") {
  const pools = getBootstrapCandidatePools(bootstrap);
  const requestedPool =
    type === "election-candidate"
      ? pools.electionCandidates
      : pools.currentRepresentatives;

  if (!constituencyId) {
    return requestedPool;
  }

  return requestedPool.filter(
    (candidate) => candidate.constituencyId === constituencyId
  );
}

function getCandidateById(bootstrap, candidateId) {
  const pools = getBootstrapCandidatePools(bootstrap);
  const allCandidates = [
    ...pools.currentRepresentatives,
    ...pools.electionCandidates,
  ];

  return (
    allCandidates.find((candidate) => {
      const normalizedCandidateId = normalizeText(candidate.id);
      const normalizedRequestedId = normalizeText(candidateId);

      return (
        candidate.id === candidateId ||
        normalizedCandidateId === normalizedRequestedId ||
        normalizedCandidateId.startsWith(normalizedRequestedId) ||
        normalizeText(candidate.name) === normalizedRequestedId
      );
    }) || null
  );
}

function mergeCandidateDetail(baseCandidate, detailCandidate) {
  if (!baseCandidate) {
    return null;
  }

  const merged = {
    ...baseCandidate,
    ...(detailCandidate || {}),
  };

  merged.officialLinks = dedupeSources([
    ...(baseCandidate.officialLinks || []),
    ...(detailCandidate?.officialLinks || []),
  ]);
  merged.partyLinks = dedupeSources([
    ...(baseCandidate.partyLinks || []),
    ...(detailCandidate?.partyLinks || []),
  ]);
  merged.sources = dedupeSources([
    ...(baseCandidate.sources || []),
    ...(detailCandidate?.sources || []),
    ...(merged.officialLinks || []),
    ...(merged.partyLinks || []),
    ...(merged.keyIssues || []).map((issue) => issue.source),
    ...(merged.activity || []).map((entry) => entry.source),
    ...(merged.committees || []).map((entry) => entry.source),
    ...(merged.offices || []).map((entry) => entry.source),
    ...(merged.recentQuestions || []).map((entry) => entry.source),
    ...(merged.recentDebates || []).map((entry) => entry.source),
    ...(merged.recentVotes || []).map((entry) => entry.source),
  ]);

  merged.committees = merged.committees || [];
  merged.offices = merged.offices || [];
  merged.recentQuestions = merged.recentQuestions || [];
  merged.recentDebates = merged.recentDebates || [];
  merged.recentVotes = merged.recentVotes || [];
  merged.evidenceCounts = merged.evidenceCounts || {
    committees: merged.committees.length,
    offices: merged.offices.length,
    questions: merged.recentQuestions.length,
    debates: merged.recentDebates.length,
    votes: merged.recentVotes.length,
  };
  merged.evidenceStatus =
    merged.evidenceStatus ||
    (Object.values(merged.evidenceCounts).some(Boolean)
      ? "evidenceBacked"
      : "summaryOnly");
  merged.issueCoverageById = merged.issueCoverageById || {};
  merged.issueEvidenceCount =
    merged.issueEvidenceCount ||
    Object.values(merged.issueCoverageById).filter(Boolean).length;
  merged.coverageNote =
    merged.coverageNote ||
    `Issue-linked evidence currently covers ${merged.issueEvidenceCount} of ${
      (merged.keyIssues || []).length
    } tracked issues.`;
  merged.sourceCount = merged.sources.length;

  return merged;
}

function buildCompareSet(bootstrap, candidateIds) {
  const selectedCandidates = candidateIds
    .map((candidateId) => getCandidateById(bootstrap, candidateId))
    .filter(Boolean);

  return {
    candidates: selectedCandidates,
    rows: bootstrap.issueCatalog.map((issue) => ({
      issueId: issue.id,
      label: issue.label,
      prompt: issue.prompt,
      cells: selectedCandidates.map((candidate) => getCompareCell(candidate, issue)),
    })),
  };
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

function getReleaseStage(bootstrap = {}) {
  return bootstrap.meta?.releaseStage || DEFAULT_RELEASE_STAGE;
}

function getBootstrapMeta(bootstrap = {}) {
  const syncStatus = deriveSyncStatus(bootstrap.meta || {});

  return {
    ...bootstrap.meta,
    contentPolicyVersion:
      bootstrap.meta?.contentPolicyVersion || CONTENT_POLICY_VERSION,
    fallbackMode:
      bootstrap.meta?.fallbackMode ||
      (syncStatus === "stale" ? "bundled-stale-snapshot" : "bundled-official-snapshot"),
    methodologyVersion:
      bootstrap.meta?.methodologyVersion || METHODOLOGY_VERSION,
    releaseStage: getReleaseStage(bootstrap),
    staleAfterDays: bootstrap.meta?.staleAfterDays || DEFAULT_STALE_AFTER_DAYS,
    syncStatus,
  };
}

function getCoverage(bootstrap) {
  const pools = getBootstrapCandidatePools(bootstrap);
  const baseCoverage = bootstrap.coverage || {};
  const totalConstituencies = (bootstrap.constituencies || []).length;
  const constituenciesWithBoundary = (bootstrap.constituencies || []).filter(
    (item) => item?.boundary?.coordinates?.length
  ).length;

  return {
    ...baseCoverage,
    constituenciesWithBoundary,
    currentRepresentatives:
      baseCoverage.currentRepresentatives || pools.currentRepresentatives.length,
    electionCandidates:
      baseCoverage.electionCandidates || pools.electionCandidates.length,
    totalConstituencies,
  };
}

function getLookupModes(bootstrap) {
  return bootstrap.lookupModes || ["constituency", "town", "address", "eircode"];
}

function getLookupPrecisionCapabilities(bootstrap) {
  return (
    bootstrap.lookupPrecisionCapabilities || LOOKUP_PRECISION_CAPABILITIES
  );
}

function getConstituencyById(bootstrap, constituencyId) {
  return (
    bootstrap.constituencies.find((item) => item.id === constituencyId) || null
  );
}

function filterConstituencies(bootstrap, query) {
  return lookupConstituencies(bootstrap.constituencies, { query }).results;
}

function filterNews(bootstrap, constituencyId) {
  if (!constituencyId) {
    return bootstrap.newsFeed;
  }

  return bootstrap.newsFeed.filter(
    (item) =>
      (item.constituencyIds || []).includes(constituencyId) ||
      item.constituencyId === constituencyId
  );
}

module.exports = {
  BOOTSTRAP_PATH,
  DETAILS_PATH,
  PORTRAITS_DIR,
  DEFAULT_RELEASE_STAGE,
  buildCompareSet,
  filterConstituencies,
  filterNews,
  getCandidateById,
  getBootstrapMeta,
  getCandidates,
  getCoverage,
  getConstituencyById,
  getLookupModes,
  getLookupPrecisionCapabilities,
  getReleaseStage,
  deriveSyncStatus,
  loadBundle,
  lookupConstituencies,
  mergeCandidateDetail,
};
