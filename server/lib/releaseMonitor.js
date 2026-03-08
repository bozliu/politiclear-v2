const ALERT_THRESHOLDS = {
  bootstrap_failure: 1,
  candidate_detail_failure: 2,
  external_link_failure: 3,
  stale_data: 1,
};

function getStore() {
  if (!globalThis.__POLITICLEAR_RELEASE_MONITOR__) {
    globalThis.__POLITICLEAR_RELEASE_MONITOR__ = {
      incidents: [],
    };
  }

  return globalThis.__POLITICLEAR_RELEASE_MONITOR__;
}

function pruneIncidents(incidents, horizonMs) {
  const now = Date.now();
  return incidents.filter((incident) => now - incident.timestampMs <= horizonMs);
}

function normalizeIncident(payload = {}) {
  const eventType = `${payload.eventType || "unknown_event"}`.trim();
  const message = `${payload.message || ""}`.trim();

  return {
    eventType,
    level: `${payload.level || "warning"}`.trim() || "warning",
    message,
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    timestamp: payload.timestamp || new Date().toISOString(),
    timestampMs: Date.parse(payload.timestamp || new Date().toISOString()) || Date.now(),
  };
}

function reportIncident(payload = {}) {
  const store = getStore();
  const incident = normalizeIncident(payload);

  store.incidents = pruneIncidents([...store.incidents, incident], 24 * 60 * 60 * 1000).slice(-100);
  return incident;
}

function getMonitoringSummary() {
  const store = getStore();
  const incidents = pruneIncidents(store.incidents, 24 * 60 * 60 * 1000);
  store.incidents = incidents;

  const countsByType = incidents.reduce((summary, incident) => {
    summary[incident.eventType] = (summary[incident.eventType] || 0) + 1;
    return summary;
  }, {});

  const exceeded = Object.entries(ALERT_THRESHOLDS)
    .filter(([eventType, threshold]) => (countsByType[eventType] || 0) >= threshold)
    .map(([eventType, threshold]) => ({
      eventType,
      count: countsByType[eventType] || 0,
      threshold,
    }));

  return {
    alertState: exceeded.length ? "elevated" : "normal",
    countsByType,
    incidentsLast24h: incidents.length,
    latestIncident: incidents[incidents.length - 1] || null,
    thresholds: ALERT_THRESHOLDS,
    thresholdExceeded: exceeded,
  };
}

module.exports = {
  getMonitoringSummary,
  reportIncident,
};
