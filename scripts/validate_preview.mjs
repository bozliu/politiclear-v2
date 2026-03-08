#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

const releaseUrl = process.argv[2];

if (!releaseUrl) {
  console.error("Usage: node scripts/validate_preview.mjs <release-url>");
  process.exit(1);
}

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const scripts = [
  path.join(projectRoot, "scripts", "validate_release_api.mjs"),
  path.join(projectRoot, "scripts", "validate_release_ui.mjs"),
];

for (const scriptPath of scripts) {
  const result = spawnSync(process.execPath, [scriptPath, releaseUrl], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(
  JSON.stringify(
    {
      releaseUrl: releaseUrl.replace(/\/+$/g, ""),
      status: "validated",
    },
    null,
    2
  )
);
