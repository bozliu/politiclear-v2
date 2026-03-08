const fs = require("fs");
const path = require("path");
const cors = require("cors");
const express = require("express");
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
} = require("./lib/politiclearData");
const { getMonitoringSummary, reportIncident } = require("./lib/releaseMonitor");

const PORT = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(express.json());

function sendCacheError(res, error) {
  res.status(500).json({
    error: "Generated data cache is missing. Run `npm run ingest:data` first.",
    details: error.message,
  });
}

function withBundle(res, callback) {
  try {
    const bundle = loadBundle();
    callback(bundle);
  } catch (error) {
    sendCacheError(res, error);
  }
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
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Content-Type", contentType);
  res.send(fs.readFileSync(resolvedPortraitPath));
  return true;
}

async function proxyCandidateImage(req, res, candidateId) {
  try {
    const { bootstrap, details } = loadBundle();
    const baseCandidate = getCandidateById(bootstrap, candidateId);

    if (!baseCandidate) {
      sendFallbackAvatar(res, {
        constituencyName: "Ireland",
        name: "Politiclear",
        party: "Candidate profile",
      });
      return;
    }

    const detailCandidate =
      details.candidateDetails?.[baseCandidate.id] || null;
    const portraitPath =
      detailCandidate?.portraitPath ||
      baseCandidate.portraitPath ||
      null;

    if (sendPortraitFile(res, portraitPath)) {
      return;
    }

    const imageUrl =
      detailCandidate?.sourceImageUrl ||
      detailCandidate?.imageUrl ||
      baseCandidate.sourceImageUrl ||
      baseCandidate.imageUrl;

    if (!imageUrl) {
      sendFallbackAvatar(res, baseCandidate);
      return;
    }

    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/*",
        Referer: detailCandidate?.profileUrl || baseCandidate.profileUrl || "https://www.oireachtas.ie/",
        "User-Agent": "PoliticlearPreview/2.0",
      },
    });

    if (!response.ok) {
      sendFallbackAvatar(res, baseCandidate);
      return;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", contentType);
    res.send(buffer);
  } catch (error) {
    sendFallbackAvatar(res, {
      constituencyName: "Ireland",
      name: "Politiclear",
      party: "Candidate profile",
    });
  }
}

app.get("/health", (req, res) => {
  withBundle(res, ({ bootstrap, details }) => {
    res.json({
      coverage: getCoverage(bootstrap),
      detailGeneratedAt: details.meta?.generatedAt || null,
      generatedAt: bootstrap.meta?.generatedAt || null,
      lastUpdated: bootstrap.meta?.lastUpdated || null,
      monitoring: getMonitoringSummary(),
      releaseStage: getReleaseStage(bootstrap),
      staleAfterDays: bootstrap.meta?.staleAfterDays || 2,
      source: "politiclear-cache",
      status: "ok",
      syncStatus: deriveSyncStatus(bootstrap.meta || {}),
    });
  });
});

app.get("/bootstrap", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    res.json({
      ...bootstrap,
      coverage: getCoverage(bootstrap),
      lookupPrecisionCapabilities: getLookupPrecisionCapabilities(bootstrap),
      lookupModes: getLookupModes(bootstrap),
      meta: {
        ...getBootstrapMeta(bootstrap),
        monitoring: getMonitoringSummary(),
      },
    });
  });
});

app.get("/constituencies", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    res.json(bootstrap.constituencies);
  });
});

app.get("/constituencies/:id", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    const constituency = getConstituencyById(bootstrap, req.params.id);

    if (!constituency) {
      res.status(404).json({ error: "Constituency not found" });
      return;
    }

    res.json(constituency);
  });
});

app.get("/lookup/constituency", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    res.json(
      lookupConstituencies(bootstrap.constituencies, {
        address: req.query.address,
        eircode: req.query.eircode,
        query: req.query.query,
      })
    );
  });
});

app.get("/candidates", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    res.json(
      getCandidates(
        bootstrap,
        req.query.constituencyId,
        req.query.type || "current-representative"
      )
    );
  });
});

app.get("/candidates/:id", (req, res) => {
  withBundle(res, ({ bootstrap, details }) => {
    const baseCandidate = getCandidateById(bootstrap, req.params.id);

    if (!baseCandidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    const detailCandidate =
      details.candidateDetails?.[baseCandidate.id] || null;

    res.json(mergeCandidateDetail(baseCandidate, detailCandidate));
  });
});

app.get("/compare", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    const candidateIds = `${req.query.candidateIds || ""}`
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    res.json(buildCompareSet(bootstrap, candidateIds));
  });
});

app.get("/news", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    res.json(filterNews(bootstrap, req.query.constituencyId));
  });
});

app.get("/learning/eligibility", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    res.json({
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
  });
});

app.get("/resources/official", (req, res) => {
  withBundle(res, ({ bootstrap }) => {
    res.json(bootstrap.officialResources);
  });
});

app.get("/ops/summary", (req, res) => {
  res.json(getMonitoringSummary());
});

app.post("/ops/report", (req, res) => {
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
  res.status(202).json({
    monitoring: getMonitoringSummary(),
    ok: true,
  });
});

app.get("/images/candidates/:id", async (req, res) => {
  await proxyCandidateImage(req, res, req.params.id);
});

app.listen(PORT, () => {
  console.log(`Politiclear API listening on http://localhost:${PORT}`);
});
