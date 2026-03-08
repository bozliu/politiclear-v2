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

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        failures,
        summary,
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
