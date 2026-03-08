#!/usr/bin/env node

const releaseUrl = process.argv[2];
const expectedReleaseStage =
  (process.env.POLITICLEAR_EXPECT_RELEASE_STAGE || "live").trim().toLowerCase();

if (!releaseUrl) {
  console.error("Usage: node scripts/validate_release_api.mjs <release-url>");
  process.exit(1);
}

const normalizedReleaseUrl = releaseUrl.replace(/\/+$/g, "");
const maxAttempts = 4;
const retryDelayMs = 3000;
const requestTimeoutMs = 10000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiUrl(baseUrl, pathname) {
  const url = new URL(baseUrl);
  const hostname =
    ["localhost", "127.0.0.1"].includes(url.hostname) ? "127.0.0.1" : url.hostname;

  if (["localhost", "127.0.0.1"].includes(url.hostname) && url.port !== "4000") {
    return `${url.protocol}//${hostname}:4000${pathname.replace(/^\/api/, "")}`;
  }

  return `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}${pathname}`;
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON but received ${contentType || "unknown content type"}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${requestTimeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForCheck(label, callback) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      console.error(
        `[validate_release_api] ${label} attempt ${attempt}/${maxAttempts} failed: ${error.message}`
      );

      if (attempt < maxAttempts) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError || new Error(`Unknown ${label} validation failure`);
}

async function validateHealth() {
  const healthUrl = getApiUrl(normalizedReleaseUrl, "/api/health");
  const payload = await fetchJsonWithTimeout(healthUrl);

  if (payload.status !== "ok") {
    throw new Error(`Health payload did not return status=ok: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function validateBootstrap() {
  const bootstrapUrl = getApiUrl(normalizedReleaseUrl, "/api/bootstrap");
  const payload = await fetchJsonWithTimeout(bootstrapUrl);
  const constituencies = payload.constituencies || [];
  const withBoundary = constituencies.filter(
    (item) => item?.boundary?.coordinates?.length
  ).length;

  if (constituencies.length !== 43) {
    throw new Error(`Expected 43 constituencies, got ${constituencies.length}`);
  }

  if ((payload.coverage?.currentRepresentatives || 0) !== 174) {
    throw new Error("Bootstrap did not return 174 current representatives");
  }

  if ((payload.coverage?.electionCandidates || 0) !== 676) {
    throw new Error("Bootstrap did not return 676 election candidates");
  }

  if (withBoundary !== 43) {
    throw new Error(`Expected 43 constituency boundaries, got ${withBoundary}`);
  }

  const actualReleaseStage = `${payload.meta?.releaseStage || ""}`.trim().toLowerCase();
  if (expectedReleaseStage !== "any" && actualReleaseStage !== expectedReleaseStage) {
    throw new Error(
      `Expected releaseStage=${expectedReleaseStage}, got ${payload.meta?.releaseStage || "missing"}`
    );
  }

  if (!payload.meta?.contentPolicyVersion) {
    throw new Error("Bootstrap did not return contentPolicyVersion");
  }

  if (!payload.meta?.methodologyVersion) {
    throw new Error("Bootstrap did not return methodologyVersion");
  }

  if (!payload.meta?.fallbackMode) {
    throw new Error("Bootstrap did not return fallbackMode");
  }

  return {
    contentPolicyVersion: payload.meta?.contentPolicyVersion || null,
    fallbackMode: payload.meta?.fallbackMode || null,
    generatedAt: payload.meta?.generatedAt || null,
    lastUpdated: payload.meta?.lastUpdated || null,
    methodologyVersion: payload.meta?.methodologyVersion || null,
    expectedReleaseStage,
    releaseStage: payload.meta?.releaseStage || null,
    withBoundary,
  };
}

const health = await waitForCheck("health", validateHealth);
const bootstrap = await waitForCheck("bootstrap", validateBootstrap);

console.log(
  JSON.stringify(
    {
      bootstrap,
      health,
      releaseUrl: normalizedReleaseUrl,
      status: "validated-api",
    },
    null,
    2
  )
);
