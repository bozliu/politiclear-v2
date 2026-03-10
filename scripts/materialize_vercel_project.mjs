#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const projectFile = path.join(projectRoot, ".vercel", "project.json");

const token = `${process.env.VERCEL_TOKEN || ""}`.trim();
const projectId = `${process.env.VERCEL_PROJECT_ID || ""}`.trim();
const orgId = `${process.env.VERCEL_ORG_ID || ""}`.trim();
const fallbackProjectName = `${process.env.VERCEL_PROJECT_SLUG || ""}`.trim();

if (!token) {
  console.error("VERCEL_TOKEN is required to verify Vercel project access.");
  process.exit(1);
}

if (!projectId || !orgId) {
  console.error("VERCEL_PROJECT_ID and VERCEL_ORG_ID are required.");
  process.exit(1);
}

let existingConfig = null;
try {
  existingConfig = JSON.parse(await fs.readFile(projectFile, "utf8"));
} catch {
  existingConfig = null;
}

const projectUrl = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`);
projectUrl.searchParams.set("teamId", orgId);

const response = await fetch(projectUrl, {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  },
});

const rawBody = await response.text();
let payload = null;

try {
  payload = rawBody ? JSON.parse(rawBody) : null;
} catch {
  payload = rawBody || null;
}

if (!response.ok) {
  const message =
    payload?.error?.message ||
    payload?.message ||
    response.statusText ||
    "unknown Vercel API error";
  console.error(
    `Vercel project access preflight failed for ${projectId} in ${orgId}: ${response.status} ${message}`
  );
  process.exit(1);
}

const projectName =
  `${payload?.name || ""}`.trim() ||
  fallbackProjectName ||
  `${existingConfig?.projectName || ""}`.trim();

if (!projectName) {
  console.error("Vercel project preflight succeeded, but the project name is missing.");
  process.exit(1);
}

const settings = {
  createdAt: payload?.createdAt ?? existingConfig?.settings?.createdAt ?? null,
  framework: payload?.framework ?? existingConfig?.settings?.framework ?? null,
  devCommand: payload?.devCommand ?? existingConfig?.settings?.devCommand ?? null,
  installCommand: payload?.installCommand ?? existingConfig?.settings?.installCommand ?? null,
  buildCommand: payload?.buildCommand ?? existingConfig?.settings?.buildCommand ?? null,
  outputDirectory: payload?.outputDirectory ?? existingConfig?.settings?.outputDirectory ?? null,
  rootDirectory: payload?.rootDirectory ?? existingConfig?.settings?.rootDirectory ?? null,
  directoryListing: payload?.directoryListing ?? existingConfig?.settings?.directoryListing ?? false,
  nodeVersion: payload?.nodeVersion ?? existingConfig?.settings?.nodeVersion ?? null,
};

await fs.mkdir(path.dirname(projectFile), { recursive: true });
await fs.writeFile(
  projectFile,
  `${JSON.stringify({ projectId, orgId, projectName, settings }, null, 2)}\n`,
  "utf8"
);

console.error(`Verified Vercel access and wrote ${projectFile} for ${projectName}.`);
