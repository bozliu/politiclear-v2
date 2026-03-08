#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const outputPath = path.join(
  projectRoot,
  "data",
  "generated",
  "thejournal-ge24-candidates.json"
);
const constituencyIds = Array.from({ length: 43 }, (_, index) => 86 + index);
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function normalizeText(value = "") {
  return `${value}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifyText(value = "") {
  return normalizeText(value).replace(/\s+/g, "-");
}

function candidateRegistryKey(name, constituencyName) {
  return `${slugifyText(name)}::${slugifyText(constituencyName)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function upscaleImageUrl(imageUrl = "") {
  return imageUrl.replace(/([?&]width=)\d+/i, "$1600");
}

function pickCandidateName(lines = [], href = "") {
  let selected = "";

  for (const line of lines) {
    if (/^[A-Z]{1,4}$/.test(line)) {
      continue;
    }

    if (/^(ELECTED|ELIMINATED)$/i.test(line)) {
      continue;
    }

    if (/^Elected on$/i.test(line)) {
      continue;
    }

    if (/^Count\s*\d+$/i.test(line)) {
      continue;
    }

    if (/^[+,\d\s]+$/.test(line)) {
      continue;
    }

    if (line.length > selected.length) {
      selected = line;
    }
  }

  if (selected) {
    return selected;
  }

  return decodeURIComponent(href.replace(/\/$/, "").split("/").pop() || "")
    .replace(/-/g, " ")
    .trim();
}

async function scrapeConstituency(page, constituencyId) {
  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await page.goto(
        `https://www.thejournal.ie/section/ge24/constituency/${constituencyId}`,
        {
          timeout: 60000,
          waitUntil: "domcontentloaded",
        }
      );
      const status = response?.status?.() ?? 0;

      if (status === 429) {
        throw new Error("429");
      }

      await page.waitForTimeout(4500);

      const payload = await page.evaluate(() => {
        const title = document.title || "";
        const constituencyName = title.includes("·")
          ? title.split("·")[0].trim()
          : title.trim();
        const anchors = Array.from(
          document.querySelectorAll('a[href*="/section/ge24/candidate/"]')
        );
        const items = [];

        for (const anchor of anchors) {
          const image = anchor.querySelector('img[src*="/candidate/"]');
          if (!image) {
            continue;
          }

          const href = anchor.href;
          const lines = (anchor.innerText || "")
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);

          items.push({
            candidatePageUrl: href,
            constituencyName,
            imageUrl: `${image.src}`,
            lines,
          });
        }

        return {
          constituencyName,
          items,
        };
      });

      if (!payload.constituencyName || !payload.items.length) {
        throw new Error("empty-candidate-list");
      }

      return payload;
    } catch (error) {
      lastError = error;
      await sleep(attempt * 12000);
    }
  }

  throw lastError || new Error(`Failed to scrape constituency ${constituencyId}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "Accept-Language": "en-IE,en;q=0.9",
    },
    locale: "en-IE",
    userAgent,
    viewport: { width: 1440, height: 1080 },
  });

  // We only need DOM attributes, not the image bytes themselves.
  await context.route("**/*", (route) => {
    const resourceType = route.request().resourceType();
    if (resourceType === "image" || resourceType === "font" || resourceType === "media") {
      route.abort();
      return;
    }

    route.continue();
  });

  const page = await context.newPage();
  const registry = {};
  const errors = [];

  try {
    for (const constituencyId of constituencyIds) {
      try {
        const payload = await scrapeConstituency(page, constituencyId);
        const seenUrls = new Set();

        for (const item of payload.items) {
          if (!item.candidatePageUrl || !item.imageUrl || seenUrls.has(item.candidatePageUrl)) {
            continue;
          }
          seenUrls.add(item.candidatePageUrl);

          const candidateName = pickCandidateName(item.lines, item.candidatePageUrl);
          const pathParts = new URL(item.candidatePageUrl).pathname
            .split("/")
            .filter(Boolean);
          const candidateSlug = decodeURIComponent(pathParts[pathParts.length - 1] || "");
          const candidateIdMatch = `${item.imageUrl}`.match(/\/candidate\/(\d+)\//);

          registry[candidateRegistryKey(candidateName, payload.constituencyName)] = {
            candidateName,
            candidateSlug,
            constituencyName: payload.constituencyName,
            portraitDeliveryMode: "proxied",
            portraitPath: null,
            portraitResolutionState: "resolved",
            portraitSourceDomain: "thejournal.ie",
            portraitSourcePageUrl: item.candidatePageUrl,
            portraitSourceType: "media",
            portraitSourceUrl: upscaleImageUrl(item.imageUrl),
            sourceImageUrl: upscaleImageUrl(item.imageUrl),
            thejournalCandidateId: candidateIdMatch?.[1] || null,
          };
        }

        await sleep(2500);
      } catch (error) {
        errors.push({
          constituencyId,
          message: error.message || String(error),
        });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        candidateCount: Object.keys(registry).length,
        candidates: registry,
        constituencyIds,
        errors,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        candidateCount: Object.keys(registry).length,
        constituencies: constituencyIds.length,
        errors,
        outputPath,
        status: "ok",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
