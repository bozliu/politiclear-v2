const fs = require("fs");
const path = require("path");
const {
  BOOTSTRAP_PATH,
  buildCompareSet,
  deriveSyncStatus,
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
  loadBundle,
  lookupConstituencies,
  mergeCandidateDetail,
} = require("../server/lib/politiclearData");
const {
  getMonitoringSummary,
  reportIncident,
} = require("../server/lib/releaseMonitor");

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.send(JSON.stringify(payload));
}

function buildFallbackAvatarSvg(candidate) {
  const parts = `${candidate?.name || "?"}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = (parts.length ? parts.map((part) => part[0]).join("") : "?").toUpperCase();
  const subtitle = `${candidate?.party || "Politiclear"} · ${candidate?.constituencyName || "Ireland"}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${initials}">
  <rect width="512" height="512" rx="72" fill="#0d3248"/>
  <circle cx="256" cy="196" r="104" fill="#1d5d7c"/>
  <rect x="72" y="318" width="368" height="122" rx="32" fill="#dbe8f2"/>
  <text x="256" y="228" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="112" font-weight="700">${initials}</text>
  <text x="256" y="366" text-anchor="middle" fill="#112236" font-family="Arial, sans-serif" font-size="28" font-weight="700">${candidate?.name || "Politiclear profile"}</text>
  <text x="256" y="404" text-anchor="middle" fill="#566575" font-family="Arial, sans-serif" font-size="20">${subtitle}</text>
</svg>`;
}

function sendFallbackAvatar(res, candidate) {
  res.status(200);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.send(buildFallbackAvatarSvg(candidate));
}

function sendPortraitFile(res, portraitPath) {
  if (!portraitPath) {
    return false;
  }

  const resolvedPortraitPath = path.join(
    path.dirname(BOOTSTRAP_PATH),
    portraitPath
  );

  if (!fs.existsSync(resolvedPortraitPath)) {
    return false;
  }

  const extension = path.extname(resolvedPortraitPath).toLowerCase();
  const contentType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

  res.status(200);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Content-Type", contentType);
  res.send(fs.readFileSync(resolvedPortraitPath));
  return true;
}

async function sendCandidateImage(res, bootstrap, details, candidateId) {
  try {
    const baseCandidate = getCandidateById(bootstrap, candidateId);

    if (!baseCandidate) {
      sendFallbackAvatar(res, {
        constituencyName: "Ireland",
        name: "Politiclear",
        party: "Candidate profile",
      });
      return;
    }

    const detailCandidate = details.candidateDetails?.[baseCandidate.id] || null;
    const portraitPath =
      detailCandidate?.portraitPath ||
      baseCandidate.portraitPath ||
      null;

    if (sendPortraitFile(res, portraitPath)) {
      return;
    }

    const imageUrl =
      detailCandidate?.sourceImageUrl ||
      detailCandidate?.portraitSourceUrl ||
      detailCandidate?.imageUrl ||
      baseCandidate.sourceImageUrl ||
      baseCandidate.portraitSourceUrl ||
      baseCandidate.imageUrl;

    if (!imageUrl) {
      sendFallbackAvatar(res, baseCandidate);
      return;
    }

    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/*",
        Referer:
          detailCandidate?.portraitSourcePageUrl ||
          baseCandidate.portraitSourcePageUrl ||
          detailCandidate?.profileUrl ||
          baseCandidate.profileUrl ||
          "https://www.oireachtas.ie/",
        "User-Agent": "PoliticlearPreview/2.0",
      },
    });

    if (!response.ok) {
      sendFallbackAvatar(res, baseCandidate);
      return;
    }

    res.status(200);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    sendFallbackAvatar(res, {
      constituencyName: "Ireland",
      name: "Politiclear",
      party: "Candidate profile",
    });
  }
}

module.exports = async (req, res) => {
  try {
    const { bootstrap, details } = loadBundle();
    const routeParts = Array.isArray(req.query.route)
      ? req.query.route
      : req.query.route
        ? `${req.query.route}`
            .split("/")
            .map((part) => part.trim())
            .filter(Boolean)
        : [];

    if (!routeParts.length) {
      sendJson(res, 404, { error: "Route not found" });
      return;
    }

    const [resource, id] = routeParts;

    if (resource === "health") {
      sendJson(res, 200, {
        coverage: getCoverage(bootstrap),
        detailGeneratedAt: details.meta?.generatedAt || null,
        generatedAt: bootstrap.meta?.generatedAt || null,
        lastUpdated: bootstrap.meta?.lastUpdated || null,
        monitoring: getMonitoringSummary(),
        releaseStage: getReleaseStage(bootstrap),
        staleAfterDays: bootstrap.meta?.staleAfterDays || 2,
        source: "politiclear-cache",
        status: "ok",
        syncStatus: deriveSyncStatus(bootstrap.meta),
      });
      return;
    }

    if (resource === "bootstrap") {
      sendJson(res, 200, {
        ...bootstrap,
        coverage: getCoverage(bootstrap),
        lookupPrecisionCapabilities: getLookupPrecisionCapabilities(bootstrap),
        lookupModes: getLookupModes(bootstrap),
        meta: {
          ...getBootstrapMeta(bootstrap),
          monitoring: getMonitoringSummary(),
        },
      });
      return;
    }

    if (resource === "constituencies" && !id) {
      sendJson(res, 200, bootstrap.constituencies);
      return;
    }

    if (resource === "constituencies" && id) {
      const constituency = getConstituencyById(bootstrap, id);
      if (!constituency) {
        sendJson(res, 404, { error: "Constituency not found" });
        return;
      }

      sendJson(res, 200, constituency);
      return;
    }

    if (resource === "lookup" && id === "constituency") {
      sendJson(
        res,
        200,
        lookupConstituencies(bootstrap.constituencies, {
          address: req.query.address,
          eircode: req.query.eircode,
          query: req.query.query,
        })
      );
      return;
    }

    if (resource === "candidates" && !id) {
      sendJson(
        res,
        200,
        getCandidates(
          bootstrap,
          req.query.constituencyId,
          req.query.type || "current-representative"
        )
      );
      return;
    }

    if (resource === "candidates" && id) {
      const baseCandidate = getCandidateById(bootstrap, id);
      if (!baseCandidate) {
        sendJson(res, 404, { error: "Candidate not found" });
        return;
      }

      sendJson(
        res,
        200,
        mergeCandidateDetail(
          baseCandidate,
          details.candidateDetails?.[baseCandidate.id] || null
        )
      );
      return;
    }

    if (resource === "compare") {
      const candidateIds = `${req.query.candidateIds || ""}`
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      sendJson(res, 200, buildCompareSet(bootstrap, candidateIds));
      return;
    }

    if (resource === "news") {
      sendJson(res, 200, filterNews(bootstrap, req.query.constituencyId));
      return;
    }

    if (resource === "learning" && id === "eligibility") {
      sendJson(res, 200, {
        boundarySource: bootstrap.boundarySource || null,
        checklistSections: bootstrap.checklistSections,
        contentPolicyVersion: getBootstrapMeta(bootstrap).contentPolicyVersion,
        coverage: getCoverage(bootstrap),
        fallbackMode: getBootstrapMeta(bootstrap).fallbackMode,
        eligibilityFlow: bootstrap.eligibilityFlow,
        generatedAt: bootstrap.meta?.generatedAt || null,
        issueCatalog: bootstrap.issueCatalog,
        lastUpdated: bootstrap.meta?.lastUpdated || null,
        methodologyVersion: getBootstrapMeta(bootstrap).methodologyVersion,
        releaseStage: getReleaseStage(bootstrap),
        lookupPrecisionCapabilities: getLookupPrecisionCapabilities(bootstrap),
        lookupModes: getLookupModes(bootstrap),
        learningPaths: bootstrap.learningPaths,
        parties: bootstrap.parties,
        staleAfterDays: bootstrap.meta?.staleAfterDays || 2,
        stvGuide: bootstrap.stvGuide,
        syncStatus: deriveSyncStatus(bootstrap.meta || {}),
      });
      return;
    }

    if (resource === "resources" && id === "official") {
      sendJson(res, 200, bootstrap.officialResources);
      return;
    }

    if (resource === "ops" && id === "summary") {
      sendJson(res, 200, getMonitoringSummary());
      return;
    }

    if (resource === "ops" && id === "report" && req.method === "POST") {
      const incident = reportIncident(req.body || {});
      console.error(
        "[politiclear-monitor]",
        JSON.stringify({
          eventType: incident.eventType,
          level: incident.level,
          message: incident.message,
          meta: incident.meta,
          timestamp: incident.timestamp,
        })
      );
      sendJson(res, 202, {
        monitoring: getMonitoringSummary(),
        ok: true,
      });
      return;
    }

    if (resource === "images" && id === "candidates" && routeParts[2]) {
      await sendCandidateImage(res, bootstrap, details, routeParts[2]);
      return;
    }

    sendJson(res, 404, { error: "Route not found" });
  } catch (error) {
    sendJson(res, 500, {
      details: error.message,
      error: "Generated data cache is missing. Run `npm run ingest:data` first.",
    });
  }
};
