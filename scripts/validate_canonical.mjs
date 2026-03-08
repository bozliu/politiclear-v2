#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";

const canonicalUrl = process.env.VERCEL_CANONICAL_URL;

if (!canonicalUrl) {
  console.error(
    "VERCEL_CANONICAL_URL is required. Example: VERCEL_CANONICAL_URL=https://skill-deploy-017ji4k0pl.vercel.app npm run validate:canonical"
  );
  process.exit(1);
}

const scriptPath = path.join(
  path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
  "scripts",
  "validate_preview.mjs"
);

const result = spawnSync(process.execPath, [scriptPath, canonicalUrl], {
  stdio: "inherit",
  env: {
    ...process.env,
    POLITICLEAR_EXPECT_RELEASE_STAGE:
      process.env.POLITICLEAR_EXPECT_RELEASE_STAGE || "public-beta",
  },
});

process.exit(result.status || 0);
