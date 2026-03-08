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

async function loadReleaseHome(page) {
  await page.goto(normalizedReleaseUrl, {
    timeout: 30000,
    waitUntil: "load",
  });

  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || "";
      return (
        text.includes("Bundled official snapshot") ||
        text.includes("Official sync") ||
        text.includes("Sample fallback")
      );
    },
    { timeout: 30000 }
  );
}

async function getPrimaryVerticalScroller(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll("*"))
      .map((element, index) => {
        const style = getComputedStyle(element);
        return {
          className: typeof element.className === "string" ? element.className : "",
          clientHeight: element.clientHeight,
          index,
          overflowY: style.overflowY,
          scrollHeight: element.scrollHeight,
          scrollTop: element.scrollTop,
          tagName: element.tagName,
        };
      })
      .filter(
        (entry) =>
          (entry.overflowY === "auto" || entry.overflowY === "scroll") &&
          entry.clientHeight > 0 &&
          entry.scrollHeight > entry.clientHeight + 20
      )
      .sort((left, right) => {
        const leftOverflow = left.scrollHeight - left.clientHeight;
        const rightOverflow = right.scrollHeight - right.clientHeight;

        return (
          right.clientHeight - left.clientHeight ||
          rightOverflow - leftOverflow ||
          left.index - right.index
        );
      })[0] || null;
  });
}

async function assertWheelScroll(page, label, locator = null) {
  const before = await getPrimaryVerticalScroller(page);
  if (!before) {
    throw new Error(`${label} did not expose a vertically scrollable container`);
  }

  let point = null;

  if (locator) {
    const target = locator.first();
    await target.waitFor({ state: "visible", timeout: 15000 });
    const box = await target.boundingBox();
    if (!box) {
      throw new Error(`${label} did not expose a visible wheel target`);
    }

    point = {
      x: box.x + Math.max(24, Math.min(box.width / 2, box.width - 24)),
      y: box.y + Math.max(24, Math.min(box.height / 2, box.height - 24)),
    };
  } else {
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error(`${label} did not expose a viewport for wheel testing`);
    }

    point = {
      x: Math.round(viewport.width / 2),
      y: Math.round(viewport.height / 2),
    };
  }

  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, Math.max(800, Math.min(before.clientHeight, 1200)));
  await page.waitForTimeout(400);

  const after = await getPrimaryVerticalScroller(page);
  if (!after) {
    throw new Error(`${label} lost its vertical scroll container after wheel input`);
  }

  if (after.scrollTop <= before.scrollTop) {
    throw new Error(`${label} did not respond to wheel scrolling`);
  }
}

async function validateUiOnce() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await loadReleaseHome(page);

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

    await page.getByRole("button", { name: "Open live map" }).click();
    await page.waitForSelector("text=Tap a real constituency boundary", { timeout: 15000 });
    await assertWheelScroll(
      page,
      "Constituency explorer",
      page.getByText("Tap a real constituency boundary")
    );

    await loadReleaseHome(page);
    const profileButtons = page.getByText("Open profile");
    if ((await profileButtons.count()) < 1) {
      throw new Error("Release did not expose a candidate profile entry point");
    }

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

    await assertWheelScroll(page, "Candidate detail", page.getByText("Decision card"));

    const methodologyButtons = page.getByText("Methodology");
    if ((await methodologyButtons.count()) < 1) {
      throw new Error("Release did not expose a methodology entry point");
    }

    await loadReleaseHome(page);

    const compareButtons = page.getByRole("button", { name: "Add to compare" });
    if ((await compareButtons.count()) >= 2) {
      await compareButtons.first().click();
      await page.waitForFunction(() => {
        const text = document.body?.innerText || "";
        return (
          text.includes("1/4") &&
          (text.includes("Select 1 more profile to compare.") ||
            text.includes("Select 1 more to compare"))
        );
      }, { timeout: 15000 });

      await page.getByRole("button", { name: "Add to compare" }).first().click();
      await page.getByRole("button", { name: /Compare 2 selected profiles/i }).click();
      await page.waitForSelector("text=Issue matrix for", { timeout: 15000 });
      const compareBodyText = await page.locator("body").innerText();
      if (!compareBodyText.includes("2 profiles selected")) {
        throw new Error("Compare screen did not preserve the selected compare count");
      }

      const compareImageSrc = await page.evaluate(() => {
        const image = Array.from(document.querySelectorAll("img")).find((img) =>
          /\/(?:api\/)?images\/candidates\//.test(`${img.getAttribute("src") || ""}`)
        );

        return image?.getAttribute("src") || null;
      });

      if (!compareImageSrc) {
        throw new Error("Compare screen did not render a same-origin candidate portrait");
      }

      await assertWheelScroll(page, "Compare screen", page.getByText("Open evidence, not just opinions"));
    } else {
      throw new Error("Release did not expose enough candidates for compare validation");
    }

    await loadReleaseHome(page);

    const finderInput = page.getByLabel("Search constituency, town, or routing-key Eircode");
    await finderInput.fill("Dublin Bay South");
    await page.waitForFunction(() => {
      const text = document.body?.innerText || "";
      return text.includes("Official-equivalent: yes");
    }, { timeout: 15000 });

    await finderInput.fill("D04");
    await page.waitForFunction(() => {
      const text = document.body?.innerText || "";
      return (
        text.includes("Routing-key Eircode match") &&
        text.includes("Dublin Bay South") &&
        text.includes("Auto-applied to your local ballot context")
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
