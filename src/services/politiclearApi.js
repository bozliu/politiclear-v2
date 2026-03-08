import { Platform } from "react-native";

const DEFAULT_API_BASE_URL = "http://localhost:4000";
const HOSTED_WEB_API_BASE_URL = "/api";
const REQUEST_TIMEOUT_MS = 6000;

function trimTrailingSlash(value) {
  return value.replace(/\/+$/g, "");
}

export function buildApiUrl(pathname) {
  return `${getApiBaseUrl()}${pathname}`;
}

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (Platform.OS === "web") {
    if (
      typeof window !== "undefined" &&
      window.location?.hostname &&
      !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ) {
      return HOSTED_WEB_API_BASE_URL;
    }

    return DEFAULT_API_BASE_URL;
  }

  return DEFAULT_API_BASE_URL;
}

async function fetchJson(pathname) {
  return fetchJsonWithInit(pathname, {});
}

async function fetchJsonWithInit(pathname, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl(pathname), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function loadBootstrappedDataset() {
  try {
    return await fetchJson("/bootstrap");
  } catch (bootstrapError) {
    const [
      constituencies,
      currentRepresentatives,
      electionCandidates,
      newsFeed,
      learningBundle,
      officialResources,
    ] =
      await Promise.all([
        fetchJson("/constituencies"),
        fetchJson("/candidates?type=current-representative"),
        fetchJson("/candidates?type=election-candidate"),
        fetchJson("/news"),
        fetchJson("/learning/eligibility"),
        fetchJson("/resources/official"),
      ]);

    return {
      meta: {
        contentPolicyVersion:
          learningBundle.contentPolicyVersion ||
          learningBundle.meta?.contentPolicyVersion ||
          "2026-03-public-launch-rc1",
        fallbackMode:
          learningBundle.fallbackMode ||
          learningBundle.meta?.fallbackMode ||
          "bundled-official-snapshot",
        generatedAt: learningBundle.generatedAt || new Date().toISOString(),
        label: "API sync",
        lastUpdated:
          learningBundle.lastUpdated || new Date().toISOString().slice(0, 10),
        methodologyVersion:
          learningBundle.methodologyVersion ||
          learningBundle.meta?.methodologyVersion ||
          "2026-03-public-launch-rc1",
        mode: "api",
        releaseStage: learningBundle.releaseStage || "live",
        staleAfterDays: learningBundle.staleAfterDays || 2,
        syncStatus: learningBundle.syncStatus || "synced",
      },
      boundarySource: learningBundle.boundarySource || null,
      candidates: currentRepresentatives,
      checklistSections: learningBundle.checklistSections,
      constituencies,
      coverage: learningBundle.coverage || {
        currentRepresentatives: currentRepresentatives.length,
        electionCandidates: electionCandidates.length,
      },
      currentRepresentatives,
      defaultConstituencyId: constituencies[0]?.id || null,
      electionCandidates,
      eligibilityFlow: learningBundle.eligibilityFlow,
      issueCatalog: learningBundle.issueCatalog,
      lookupPrecisionCapabilities:
        learningBundle.lookupPrecisionCapabilities || {
          address: "official-handoff-or-best-match-locality",
          constituency: "exact-name",
          eircode: "routing-key",
          town: "best-match-locality",
        },
      lookupModes: learningBundle.lookupModes || ["constituency", "town", "address", "eircode"],
      learningPaths: learningBundle.learningPaths,
      newsFeed,
      officialResources,
      parties: learningBundle.parties,
      stvGuide: learningBundle.stvGuide,
      _bootstrapError: bootstrapError.message,
    };
  }
}

export async function loadCandidateDetail(candidateId) {
  return fetchJson(`/candidates/${encodeURIComponent(candidateId)}`);
}

export async function lookupConstituencies(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (`${value || ""}`.trim()) {
      searchParams.set(key, `${value}`.trim());
    }
  });

  return fetchJson(`/lookup/constituency?${searchParams.toString()}`);
}

export async function reportMonitoringEvent(eventType, payload = {}) {
  try {
    return await fetchJsonWithInit("/ops/report", {
      body: JSON.stringify({
        eventType,
        ...payload,
        timestamp: new Date().toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    return null;
  }
}
