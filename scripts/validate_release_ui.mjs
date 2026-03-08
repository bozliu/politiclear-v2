#!/usr/bin/env node

import { chromium } from "@playwright/test";

const releaseUrl = process.argv[2];
const expectedReleaseStage =
  (process.env.POLITICLEAR_EXPECT_RELEASE_STAGE || "live").trim().toLowerCase();

if (!releaseUrl) {
  console.error("Usage: node scripts/validate_release_ui.mjs <release-url>");
  process.exit(1);
}

const normalizedReleaseUrl = releaseUrl.replace(/\/+$/g, "");
const maxAttempts = 3;
const retryDelayMs = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function validateUiOnce() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(normalizedReleaseUrl, {
      timeout: 30000,
      waitUntil: "load",
    });

    await page.waitForFunction(() => {
      const text = document.body?.innerText || "";
      return (
        text.includes("Bundled official snapshot") ||
        text.includes("Official sync") ||
        text.includes("Sample fallback")
      );
    }, { timeout: 30000 });

    const bodyText = await page.locator("body").innerText();

    if (bodyText.includes("Sample fallback")) {
      throw new Error("Release is still serving Sample fallback");
    }

    if (bodyText.includes("Boundary map is still syncing")) {
      throw new Error("Release is still serving the empty boundary-map fallback");
    }

    if (expectedReleaseStage === "live") {
      if (bodyText.includes("Public beta")) {
        throw new Error("Release still renders Public beta wording in the main shell");
      }

      if (!bodyText.includes("Live service")) {
        throw new Error("Release did not render the live-service banner");
      }
    } else if (expectedReleaseStage === "public-beta") {
      if (!bodyText.includes("Public beta")) {
        throw new Error("Release did not render the public-beta banner");
      }
    }

    if (!bodyText.includes("independent civic information service")) {
      throw new Error("Release did not render the non-official disclosure copy");
    }

    if (!bodyText.includes("Trust and transparency")) {
      throw new Error("Release did not render the trust-and-transparency footer");
    }

    if (!bodyText.includes("Source policy")) {
      throw new Error("Release did not render a source-policy entry point");
    }

    if (!bodyText.includes("Corrections")) {
      throw new Error("Release did not render a corrections entry point");
    }

    const avatarCount = await page.locator("img").count();
    if (avatarCount < 1) {
      throw new Error("Release did not render any candidate avatars");
    }

    const candidateImageSrc = await page.evaluate(() => {
      const image = Array.from(document.querySelectorAll("img")).find((img) =>
        /\/(?:api\/)?images\/candidates\//.test(`${img.getAttribute("src") || ""}`)
      );

      return image?.getAttribute("src") || null;
    });

    if (!candidateImageSrc) {
      throw new Error("Release did not expose a same-origin candidate portrait URL");
    }

    const mapAlreadyVisible = bodyText.includes("Official constituency boundary map");
    if (!mapAlreadyVisible) {
      await page.getByText("Open live map").click();
      await page.waitForSelector("text=Official constituency boundary map", {
        timeout: 15000,
      });
    }

    await page.goto(normalizedReleaseUrl, {
      timeout: 30000,
      waitUntil: "load",
    });

    const profileButtons = page.getByText("Open profile");
    if ((await profileButtons.count()) > 0) {
      await profileButtons.first().click();
      await page.waitForSelector("text=Questions & debates", {
        timeout: 15000,
      });
      await page.waitForSelector("text=Votes & sources", {
        timeout: 15000,
      });

      const evidenceText = await page.locator("body").innerText();
      if (
        !evidenceText.includes("Official Oireachtas parliamentary question record.") &&
        !evidenceText.includes("Official Oireachtas vote record.")
      ) {
        throw new Error("Candidate detail did not render linked evidence records");
      }

      if (!evidenceText.includes("Summary basis:")) {
        throw new Error("Candidate detail did not render the summary basis disclosure");
      }
    }

    const methodologyButtons = page.getByText("Methodology");
    if ((await methodologyButtons.count()) < 1) {
      throw new Error("Release did not expose a methodology entry point");
    }

    await page.goto(normalizedReleaseUrl, {
      timeout: 30000,
      waitUntil: "load",
    });

    const finderInput = page.getByLabel("Search constituency, town, or routing-key Eircode");
    await finderInput.fill("Dublin Bay South");
    await page.waitForFunction(() => {
      const text = document.body?.innerText || "";
      return text.includes("Official-equivalent: yes");
    }, { timeout: 15000 });

    await finderInput.fill("D15");
    await page.waitForFunction(() => {
      const text = document.body?.innerText || "";
      return (
        text.includes("Ambiguous routing-key match") &&
        text.includes("Results shown below are not applied until you choose one.") &&
        text.includes("Dublin Fingal West") &&
        text.includes("Dublin West")
      );
    }, { timeout: 15000 });

    await finderInput.fill("12 Main Street Dublin");
    await page.waitForFunction(() => {
      const text = document.body?.innerText || "";
      return (
        text.includes("Official handoff") &&
        text.includes("Use the official tool for full address lookup")
      );
    }, { timeout: 15000 });

    const finalBodyText = await page.locator("body").innerText();
    if (finalBodyText.includes("Politiclear brief")) {
      throw new Error("Release rendered ungoverned curated feed content");
    }
  } finally {
    await browser.close();
  }
}

let lastError = null;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await validateUiOnce();
    console.log(
      JSON.stringify(
        {
          releaseUrl: normalizedReleaseUrl,
          expectedReleaseStage,
          status: "validated-ui",
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(
      `[validate_release_ui] attempt ${attempt}/${maxAttempts} failed: ${error.message}`
    );

    if (attempt < maxAttempts) {
      await sleep(retryDelayMs);
    }
  }
}

throw lastError || new Error("Unknown UI validation failure");
