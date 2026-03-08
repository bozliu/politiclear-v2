import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  loadBootstrappedDataset,
  loadCandidateDetail as fetchCandidateDetailFromApi,
  lookupConstituencies as lookupConstituenciesFromApi,
  reportMonitoringEvent,
} from "../services/politiclearApi";
import {
  createFallbackDataset,
  findConstituencies,
  getCandidateById as getCandidateByIdFromDataset,
  getBundledCandidateDetail,
  getCandidatesForConstituency,
  getCompareCandidates,
  getConstituencyById,
  getDataStatus,
  getElectionCandidatesForConstituency,
  getFeaturedUpdates,
  getNewsFeed,
  getOfficialResourceLinks,
  mergeCandidateDetail,
  mergeDatasetWithFallback,
} from "../services/politiclearRepository";

const PoliticlearContext = createContext(null);

export function PoliticlearProvider({ children }) {
  const fallbackDataset = useMemo(() => createFallbackDataset(), []);
  const [dataset, setDataset] = useState(fallbackDataset);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState(
    fallbackDataset.defaultConstituencyId
  );
  const [compareCandidateIds, setCompareCandidateIds] = useState([]);
  const [candidateDetailsById, setCandidateDetailsById] = useState({});
  const [candidateDetailStatusById, setCandidateDetailStatusById] = useState({});
  const [dataState, setDataState] = useState(getDataStatus(fallbackDataset));
  const [operationalNotice, setOperationalNotice] = useState(null);

  const reportOperationalNotice = useCallback((title, body, level = "warning") => {
    setOperationalNotice({
      body,
      createdAt: new Date().toISOString(),
      level,
      title,
    });
  }, []);
  const emitMonitoringEvent = useCallback((eventType, payload = {}) => {
    reportMonitoringEvent(eventType, payload);
  }, []);

  const clearOperationalNotice = useCallback(() => setOperationalNotice(null), []);

  useEffect(() => {
    let isActive = true;

    loadBootstrappedDataset()
      .then((apiDataset) => {
        if (!isActive) {
          return;
        }

        const mergedDataset = mergeDatasetWithFallback(apiDataset);
        setDataset(mergedDataset);
        setDataState({
          ...getDataStatus(mergedDataset),
          error: apiDataset._bootstrapError || null,
        });

        if (apiDataset._bootstrapError) {
          emitMonitoringEvent("bootstrap_failure", {
            level: "warning",
            message: "Live bootstrap failed and the app fell back to the bundled snapshot.",
            meta: {
              error: apiDataset._bootstrapError,
              fallbackMode: mergedDataset.meta?.fallbackMode || "bundled-official-snapshot",
            },
          });
          reportOperationalNotice(
            "Live API fell back to bundled civic snapshot",
            "Politiclear could not complete the live bootstrap request, so the app is using the bundled public-data snapshot while keeping source links visible."
          );
        }
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setDataset(fallbackDataset);
        setDataState({
          ...getDataStatus(fallbackDataset),
          error: error.message,
        });
        emitMonitoringEvent("bootstrap_failure", {
          level: "error",
          message: "API bootstrap unavailable. The app is using the local fallback snapshot.",
          meta: {
            error: error.message,
            fallbackMode: "local-fallback",
          },
        });
        reportOperationalNotice(
          "API bootstrap unavailable",
          "Politiclear is currently running on the local fallback snapshot. Verify critical decisions with the linked official sources before relying on this session."
        );
      });

    return () => {
      isActive = false;
    };
  }, [emitMonitoringEvent, fallbackDataset, reportOperationalNotice]);

  useEffect(() => {
    if (dataState.syncStatus === "stale") {
      emitMonitoringEvent("stale_data", {
        level: "warning",
        message: "Politiclear is serving a stale civic snapshot outside the freshness window.",
        meta: {
          lastUpdated: dataState.lastUpdated,
          staleAfterDays: dataState.staleAfterDays,
        },
      });
    }
  }, [dataState.lastUpdated, dataState.staleAfterDays, dataState.syncStatus, emitMonitoringEvent]);

  const selectedConstituency = useMemo(
    () => getConstituencyById(dataset, selectedConstituencyId),
    [dataset, selectedConstituencyId]
  );

  useEffect(() => {
    if (!selectedConstituency && dataset.defaultConstituencyId) {
      setSelectedConstituencyId(dataset.defaultConstituencyId);
    }
  }, [dataset.defaultConstituencyId, selectedConstituency]);

  useEffect(() => {
    const localCandidateIds = [
      ...getCandidatesForConstituency(dataset, selectedConstituency?.id),
      ...getElectionCandidatesForConstituency(dataset, selectedConstituency?.id),
    ].map((candidate) => candidate.compareKey || candidate.id);

    setCompareCandidateIds((currentIds) =>
      currentIds.filter((candidateId) => localCandidateIds.includes(candidateId))
    );
  }, [dataset, selectedConstituency?.id]);

  const compareCandidates = useMemo(
    () =>
      compareCandidateIds
        .map((candidateId) =>
          candidateDetailsById[candidateId] ||
          getCandidateByIdFromDataset(dataset, candidateId) ||
          [...dataset.currentRepresentatives, ...dataset.electionCandidates].find(
            (candidate) => (candidate.compareKey || candidate.id) === candidateId
          )
        )
        .filter(Boolean),
    [candidateDetailsById, compareCandidateIds, dataset]
  );

  const selectConstituency = (constituencyId) => {
    setSelectedConstituencyId(constituencyId);
  };

  const toggleCompareCandidate = (candidateId) => {
    setCompareCandidateIds((currentIds) => {
      if (currentIds.includes(candidateId)) {
        return currentIds.filter((id) => id !== candidateId);
      }

      if (currentIds.length >= 4) {
        return [...currentIds.slice(1), candidateId];
      }

      return [...currentIds, candidateId];
    });
  };

  const clearCompareCandidates = () => setCompareCandidateIds([]);

  const setCompareCandidates = (candidateIds) => {
    setCompareCandidateIds(candidateIds.slice(0, 4));
  };

  const loadCandidateDetail = async (candidateId) => {
    const baseCandidate = getCandidateByIdFromDataset(dataset, candidateId);

    if (!baseCandidate) {
      return null;
    }

    const currentStatus = candidateDetailStatusById[candidateId];

    if (
      currentStatus?.status === "loaded" &&
      candidateDetailsById[candidateId]
    ) {
      return candidateDetailsById[candidateId];
    }

    if (currentStatus?.status === "loading") {
      return candidateDetailsById[candidateId] || baseCandidate;
    }

    setCandidateDetailStatusById((current) => ({
      ...current,
      [candidateId]: {
        error: null,
        status: "loading",
      },
    }));

    const bundledCandidate = mergeCandidateDetail(
      baseCandidate,
      getBundledCandidateDetail(candidateId, baseCandidate)
    );

    if (bundledCandidate) {
      setCandidateDetailsById((current) => ({
        ...current,
        [candidateId]: bundledCandidate,
      }));
      setCandidateDetailStatusById((current) => ({
        ...current,
        [candidateId]: {
          error: null,
          status: "refreshing",
        },
      }));
    }

    try {
      const detailCandidate = await fetchCandidateDetailFromApi(candidateId);
      const mergedCandidate = mergeCandidateDetail(baseCandidate, detailCandidate);

      setCandidateDetailsById((current) => ({
        ...current,
        [candidateId]: mergedCandidate,
      }));
      setCandidateDetailStatusById((current) => ({
        ...current,
        [candidateId]: {
          error: null,
          status: "loaded",
        },
      }));

      return mergedCandidate;
    } catch (error) {
      setCandidateDetailStatusById((current) => ({
        ...current,
        [candidateId]: {
          error: error.message,
          status: bundledCandidate ? "bundled" : "error",
        },
      }));
      reportOperationalNotice(
        "Candidate detail refresh failed",
        `Politiclear could not refresh live detail for ${baseCandidate.name}, so the profile is using the bundled snapshot or the best available fallback.`
      );
      emitMonitoringEvent("candidate_detail_failure", {
        level: "warning",
        message: `Candidate detail refresh failed for ${baseCandidate.name}.`,
        meta: {
          candidateId,
          fallbackStatus: bundledCandidate ? "bundled" : "base-candidate",
          error: error.message,
        },
      });

      return bundledCandidate || baseCandidate;
    }
  };

  const lookupConstituencyMatches = async (params = {}) => {
    try {
      return await lookupConstituenciesFromApi(params);
    } catch (error) {
      const query = params.eircode || params.address || params.query || "";
      const fallbackResults = findConstituencies(dataset, query).map((constituency) => ({
        ...constituency,
        isAmbiguousCandidate: false,
        lookupConfidence: "medium",
        lookupMatchKind: "fallback",
        lookupMatchReason: "local-fallback-search",
        lookupMode: "query",
        lookupPrecision: "best-match-locality",
        officialEquivalent: false,
      }));

      return {
        autoAppliedEligible: false,
        fallbackUsed: true,
        officialEquivalent: false,
        lookupConfidence: "medium",
        lookupMatchReason: "local-fallback-search",
        lookupPrecision: "best-match-locality",
        lookupPrecisionCapabilities: dataset.lookupPrecisionCapabilities,
        lookupMode: "query",
        matchKind: "fallback",
        normalizedQuery: `${query}`.trim().toLowerCase(),
        results: fallbackResults,
        selectedResult: null,
        status: fallbackResults.length ? "ambiguous" : "no-match",
      };
    }
  };

  const value = useMemo(
    () => ({
      candidateDetailStatusById,
      checklistSections: dataset.checklistSections,
      clearCompareCandidates,
      compareCandidateIds,
      compareCandidates,
      constituencies: dataset.constituencies,
      dataState,
      eligibilityFlow: dataset.eligibilityFlow,
      findConstituencies: (query) => findConstituencies(dataset, query),
      getCandidateById: (candidateId) =>
        candidateDetailsById[candidateId] ||
        getCandidateByIdFromDataset(dataset, candidateId),
      getCandidatesForConstituency: (constituencyId) =>
        getCandidatesForConstituency(dataset, constituencyId),
      getElectionCandidatesForConstituency: (constituencyId) =>
        getElectionCandidatesForConstituency(dataset, constituencyId),
      getCompareCandidates: (candidateIds) =>
        getCompareCandidates(dataset, candidateIds),
      getFeaturedUpdates: (constituencyId, limit) =>
        getFeaturedUpdates(dataset, constituencyId, limit),
      getNewsFeed: (constituencyId) => getNewsFeed(dataset, constituencyId),
      lookupConstituencies: lookupConstituencyMatches,
      loadCandidateDetail,
      issueCatalog: dataset.issueCatalog,
      lookupPrecisionCapabilities: dataset.lookupPrecisionCapabilities,
      lookupModes: dataset.lookupModes,
      learningPaths: dataset.learningPaths,
      officialResources: getOfficialResourceLinks(dataset),
      operationalNotice,
      reportExternalLinkError: ({ error, sourceLabel, url }) => {
        emitMonitoringEvent("external_link_failure", {
          level: "warning",
          message: `External source link failed for ${sourceLabel || url}.`,
          meta: {
            error: error?.message || "Unknown error",
            sourceLabel: sourceLabel || null,
            url,
          },
        });
        return reportOperationalNotice(
          "External source link failed",
          `Politiclear could not open ${sourceLabel || url}. Please retry, then report the broken link if it keeps failing. ${error?.message ? `(${error.message})` : ""}`.trim()
        );
      },
      selectedConstituency,
      selectedConstituencyId,
      selectConstituency,
      setCompareCandidates,
      stvGuide: dataset.stvGuide,
      toggleCompareCandidate,
      clearOperationalNotice,
    }),
    [
      candidateDetailStatusById,
      candidateDetailsById,
      compareCandidateIds,
      compareCandidates,
      dataState,
      dataset,
      clearOperationalNotice,
      emitMonitoringEvent,
      operationalNotice,
      lookupConstituencyMatches,
      reportOperationalNotice,
      selectedConstituency,
      selectedConstituencyId,
    ]
  );

  return (
    <PoliticlearContext.Provider value={value}>
      {children}
    </PoliticlearContext.Provider>
  );
}

export function usePoliticlear() {
  const context = useContext(PoliticlearContext);

  if (!context) {
    throw new Error("usePoliticlear must be used within PoliticlearProvider");
  }

  return context;
}
