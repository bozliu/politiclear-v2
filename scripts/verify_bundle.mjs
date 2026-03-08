#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const bundlePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(projectRoot, "data", "generated", "politiclear-cache.json");

if (!fs.existsSync(bundlePath)) {
  console.error(`Bundle file not found: ${bundlePath}`);
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const constituencies = bundle.constituencies || [];
const currentRepresentatives =
  bundle.currentRepresentatives || bundle.candidates || [];
const electionCandidates = bundle.electionCandidates || [];
const withBoundary = constituencies.filter(
  (constituency) => constituency?.boundary?.coordinates?.length
).length;

const summary = {
  bundlePath,
  currentRepresentatives: currentRepresentatives.length,
  electionCandidates: electionCandidates.length,
  generatedAt: bundle.meta?.generatedAt || null,
  lastUpdated: bundle.meta?.lastUpdated || null,
  totalConstituencies: constituencies.length,
  withBoundary,
  portraitResolvedCandidates:
    bundle.coverage?.portraitResolvedCandidates ?? null,
  portraitUnresolvedCandidates:
    bundle.coverage?.portraitUnresolvedCandidates ?? null,
};

const failures = [];

if (constituencies.length !== 43) {
  failures.push(`Expected 43 constituencies, got ${constituencies.length}`);
}

if (currentRepresentatives.length !== 174) {
  failures.push(
    `Expected 174 current representatives, got ${currentRepresentatives.length}`
  );
}

if (electionCandidates.length !== 676) {
  failures.push(
    `Expected 676 election candidates, got ${electionCandidates.length}`
  );
}

if (withBoundary !== 43) {
  failures.push(`Expected 43 constituency boundaries, got ${withBoundary}`);
}

if (!bundle.meta?.generatedAt || !bundle.meta?.lastUpdated) {
  failures.push("Bundle meta is missing generatedAt or lastUpdated");
}

if ((bundle.meta?.releaseStage || "").trim() !== "live") {
  failures.push(`Expected releaseStage=live, got ${bundle.meta?.releaseStage || "missing"}`);
}

if (!bundle.meta?.contentPolicyVersion) {
  failures.push("Bundle meta is missing contentPolicyVersion");
}

if (!bundle.meta?.methodologyVersion) {
  failures.push("Bundle meta is missing methodologyVersion");
}

if (!bundle.meta?.fallbackMode) {
  failures.push("Bundle meta is missing fallbackMode");
}

const unresolvedPortraits = electionCandidates.filter((candidate) => {
  return (
    candidate?.portraitResolutionState !== "resolved" ||
    !candidate?.portraitSourceType ||
    !candidate?.portraitSourceUrl ||
    !candidate?.sourceImageUrl
  );
});

if (unresolvedPortraits.length) {
  failures.push(
    `Expected 0 unresolved election-candidate portraits, got ${unresolvedPortraits.length}`
  );
}

const invalidMediaPortraits = electionCandidates.filter((candidate) => {
  return (
    candidate?.portraitSourceType === "media" &&
    (candidate?.portraitDeliveryMode !== "proxied" || candidate?.portraitPath)
  );
});

if (invalidMediaPortraits.length) {
  failures.push(
    `Media-backed portraits must stay proxied-only, but ${invalidMediaPortraits.length} candidates violated that rule`
  );
}

const invalidCachedPortraits = electionCandidates.filter((candidate) => {
  if (candidate?.portraitResolutionState !== "resolved") {
    return false;
  }

  if (candidate?.portraitSourceType === "media") {
    return false;
  }

  return (
    candidate?.portraitDeliveryMode !== "cached" ||
    !candidate?.portraitPath
  );
});

if (invalidCachedPortraits.length) {
  failures.push(
    `Non-media portraits must be cached local assets, but ${invalidCachedPortraits.length} candidates are missing cached portrait files`
  );
}

if ((bundle.coverage?.portraitUnresolvedCandidates ?? 0) !== 0) {
  failures.push(
    `Expected bundle coverage portraitUnresolvedCandidates=0, got ${bundle.coverage?.portraitUnresolvedCandidates}`
  );
}

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        failures,
        summary,
        portraitSample: unresolvedPortraits.slice(0, 12).map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          constituencyName: candidate.constituencyName,
          portraitDeliveryMode: candidate.portraitDeliveryMode || null,
          portraitResolutionState: candidate.portraitResolutionState || null,
          portraitSourceType: candidate.portraitSourceType || null,
        })),
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "verified",
      summary,
    },
    null,
    2
  )
);
