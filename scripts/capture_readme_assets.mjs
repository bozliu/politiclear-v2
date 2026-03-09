#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "docs", "readme-assets");
const defaultBaseUrl = "https://skill-deploy-017ji4k0pl.vercel.app";
const viewport = { width: 1440, height: 1080 };
const frameStepMs = 140;
const gifWidth = 1280;
const gifFps = 7;
const flows = {
  compare: {
    file: "compare-flow.gif",
    title: "Compare flow",
  },
  lookup: {
    file: "lookup-map-flow.gif",
    title: "Lookup + map flow",
  },
  profile: {
    file: "evidence-profile-flow.gif",
    title: "Evidence profile flow",
  },
};

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.VERCEL_CANONICAL_URL || defaultBaseUrl,
    flow: "all",
    keepFrames: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base-url" && argv[index + 1]) {
      options.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--flow" && argv[index + 1]) {
      options.flow = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--keep-frames") {
      options.keepFrames = true;
      continue;
    }

    if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Capture README GIF assets from the canonical Politiclear release.

Usage:
  node scripts/capture_readme_assets.mjs [--base-url <url>] [--flow compare|lookup|profile|all] [--keep-frames]

Examples:
  node scripts/capture_readme_assets.mjs
  node scripts/capture_readme_assets.mjs --flow compare
  VERCEL_CANONICAL_URL=${defaultBaseUrl} node scripts/capture_readme_assets.mjs --flow lookup
`);
}

function resolveFlowNames(flowValue) {
  if (flowValue === "all") {
    return Object.keys(flows);
  }

  if (!flows[flowValue]) {
    throw new Error(`Unknown flow "${flowValue}". Expected compare, lookup, profile, or all.`);
  }

  return [flowValue];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

class FrameRecorder {
  constructor(page, framesDir) {
    this.page = page;
    this.framesDir = framesDir;
    this.frameIndex = 0;
  }

  framePath(index) {
    return path.join(this.framesDir, `frame-${String(index).padStart(4, "0")}.jpg`);
  }

  async snap() {
    const currentPath = this.framePath(this.frameIndex);
    await this.page.screenshot({
      path: currentPath,
      type: "jpeg",
      quality: 82,
      fullPage: false,
      animations: "allow",
    });
    this.frameIndex += 1;
  }

  async hold(durationMs) {
    const frames = Math.max(1, Math.round(durationMs / frameStepMs));
    for (let index = 0; index < frames; index += 1) {
      await this.snap();
      if (index < frames - 1) {
        await wait(frameStepMs);
      }
    }
  }

  async click(locator, settleMs = 700) {
    await locator.hover();
    await this.hold(200);
    await locator.click();
    await this.hold(settleMs);
  }

  async clearAndType(locator, text, keyDelayMs = 95, settleMs = 900) {
    await locator.click();
    await locator.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await locator.press("Backspace");
    await this.hold(260);
    for (const character of text) {
      await locator.type(character, { delay: 0 });
      await this.hold(keyDelayMs);
    }
    await this.hold(settleMs);
  }

  async wheel(distance, steps = 6, settleMs = 180) {
    const delta = distance / steps;
    for (let index = 0; index < steps; index += 1) {
      await this.page.mouse.wheel(0, delta);
      await this.hold(settleMs);
    }
  }
}

async function clickTab(recorder, page, label) {
  const tab = page.locator("[role=tab]").filter({ hasText: new RegExp(`^${label}$`) }).first();
  await recorder.click(tab, 1100);
}

async function markNearestVerticalScroller(locator, attributeName) {
  return locator.first().evaluate((element, attrName) => {
    let current = element;
    while (current) {
      const style = getComputedStyle(current);
      if (
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        current.scrollHeight > current.clientHeight + 20
      ) {
        current.setAttribute(attrName, "active");
        return {
          clientHeight: current.clientHeight,
          scrollHeight: current.scrollHeight,
          scrollTop: current.scrollTop,
        };
      }
      current = current.parentElement;
    }
    return null;
  }, attributeName);
}

async function animateMarkedVerticalScroll(page, recorder, attributeName, from, to, steps, holdMs) {
  const scroller = page.locator(`[${attributeName}="active"]`);
  for (let index = 1; index <= steps; index += 1) {
    const nextValue = from + ((to - from) * index) / steps;
    await scroller.evaluate((element, scrollTop) => {
      element.scrollTop = scrollTop;
    }, nextValue);
    await recorder.hold(holdMs);
  }
}

async function clearMarkedScroller(page, attributeName) {
  await page
    .locator(`[${attributeName}="active"]`)
    .evaluate((element) => element.removeAttribute(attributeName))
    .catch(() => {});
}

async function getMatrixSweepMetrics(page) {
  return page.evaluate(() => {
    const findExactText = (text) =>
      Array.from(document.querySelectorAll("*")).find(
        (element) => (element.textContent || "").trim() === text
      );

    const sectionTitle = findExactText("Open evidence, not just opinions");
    const matrixIssue = findExactText("Issue");
    const nextSection = findExactText("Add or swap profiles");

    if (!sectionTitle || !matrixIssue || !nextSection) {
      return null;
    }

    let scroller = sectionTitle;
    while (scroller) {
      const style = getComputedStyle(scroller);
      if (
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        scroller.scrollHeight > scroller.clientHeight + 20
      ) {
        break;
      }
      scroller = scroller.parentElement;
    }

    if (!scroller) {
      return null;
    }

    scroller.setAttribute("data-readme-scroll-root", "active");

    const scrollerRect = scroller.getBoundingClientRect();
    const issueRect = matrixIssue.getBoundingClientRect();
    const nextSectionRect = nextSection.getBoundingClientRect();
    const currentScrollTop = scroller.scrollTop;
    const maxScrollTop = scroller.scrollHeight - scroller.clientHeight;
    const startScrollTop = Math.max(
      0,
      Math.round(currentScrollTop + (issueRect.top - scrollerRect.top) - 150)
    );
    const endScrollTop = Math.min(
      maxScrollTop,
      Math.max(
        startScrollTop + 220,
        Math.round(
          currentScrollTop +
            (nextSectionRect.top - scrollerRect.top) -
            (scroller.clientHeight - 180)
        )
      )
    );

    const matrixHorizontalScroller = matrixIssue.closest("div")?.parentElement?.parentElement;
    const horizontalOverflow =
      matrixHorizontalScroller &&
      matrixHorizontalScroller.scrollWidth > matrixHorizontalScroller.clientWidth + 20
        ? {
            maxScrollLeft:
              matrixHorizontalScroller.scrollWidth - matrixHorizontalScroller.clientWidth,
          }
        : null;

    if (horizontalOverflow) {
      matrixHorizontalScroller.setAttribute("data-readme-matrix-x", "active");
    }

    return {
      currentScrollTop,
      endScrollTop,
      horizontalOverflow,
      startScrollTop,
    };
  });
}

async function animateMatrixHorizontalPan(page, recorder) {
  const panTarget = page.locator('[data-readme-matrix-x="active"]');
  const exists = await panTarget.count();
  if (!exists) {
    return;
  }

  const maxScrollLeft = await panTarget.evaluate(
    (element) => element.scrollWidth - element.clientWidth
  );

  if (maxScrollLeft <= 20) {
    await clearMarkedScroller(page, "data-readme-matrix-x");
    return;
  }

  for (let index = 1; index <= 10; index += 1) {
    const nextValue = (maxScrollLeft * index) / 10;
    await panTarget.evaluate((element, scrollLeft) => {
      element.scrollLeft = scrollLeft;
    }, nextValue);
    await recorder.hold(120);
  }

  await clearMarkedScroller(page, "data-readme-matrix-x");
}

async function getSelectedConstituencyTitle(page) {
  return page.evaluate(() => {
    const eyebrow = Array.from(document.querySelectorAll("*")).find(
      (element) => {
        const text = (element.textContent || "").trim();
        return text === "Selected constituency" || text === "Hovered constituency";
      }
    );
    if (!eyebrow?.parentElement) {
      return null;
    }

    const textNodes = Array.from(eyebrow.parentElement.children)
      .map((element) => (element.textContent || "").trim())
      .filter(Boolean);
    return textNodes[1] || null;
  });
}

async function waitForAppReady(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("textbox", {
    name: /Search constituency, town, or routing-key Eircode/i,
  }).waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    if (!document.fonts || typeof document.fonts.ready?.then !== "function") {
      return true;
    }

    return document.fonts.status === "loaded";
  });
}

async function renderGif(sourceDir, targetPath) {
  const palettePath = path.join(sourceDir, "palette.png");
  await runCommand("ffmpeg", [
    "-y",
    "-framerate",
    String(gifFps),
    "-i",
    path.join(sourceDir, "frame-%04d.jpg"),
    "-vf",
    `fps=${gifFps},scale=${gifWidth}:-1:flags=lanczos,palettegen=stats_mode=diff`,
    "-frames:v",
    "1",
    "-update",
    "1",
    palettePath,
  ]);
  await runCommand("ffmpeg", [
    "-y",
    "-framerate",
    String(gifFps),
    "-i",
    path.join(sourceDir, "frame-%04d.jpg"),
    "-i",
    palettePath,
    "-lavfi",
    `fps=${gifFps},scale=${gifWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    "-loop",
    "0",
    targetPath,
  ]);
}

async function captureCompareFlow(page, recorder, baseUrl) {
  await waitForAppReady(page, baseUrl);
  await recorder.hold(450);
  await clickTab(recorder, page, "Candidates");
  await page.getByText("Ballot coverage for").waitFor({ state: "visible" });
  await recorder.hold(450);

  for (let index = 1; index <= 4; index += 1) {
    const addButton = page.getByRole("button", { name: "Add to compare" }).first();
    await recorder.click(addButton, index === 4 ? 900 : 700);
    await page.waitForFunction(
      (expectedCount) => (document.body?.innerText || "").includes(`${expectedCount}/4`),
      index
    );
    await recorder.hold(index === 4 ? 450 : 240);
  }

  const compareButton = page.getByRole("button", {
    name: /Compare 4 selected profiles/i,
  });
  await compareButton.waitFor({ state: "visible" });
  await recorder.hold(350);
  await recorder.click(compareButton, 1250);
  await page.waitForFunction(() => document.title === "CandidateCompare");
  await page.getByText("Open evidence, not just opinions").waitFor({
    state: "visible",
  });
  await recorder.hold(400);

  const matrixHeading = page.getByText("Open evidence, not just opinions");
  await matrixHeading.scrollIntoViewIfNeeded();
  await recorder.hold(550);

  const matrixMetrics = await getMatrixSweepMetrics(page);
  if (!matrixMetrics) {
    throw new Error("Unable to prepare compare matrix sweep for README capture");
  }

  await animateMarkedVerticalScroll(
    page,
    recorder,
    "data-readme-scroll-root",
    matrixMetrics.currentScrollTop,
    matrixMetrics.startScrollTop,
    6,
    120
  );
  await recorder.hold(600);

  if (matrixMetrics.horizontalOverflow) {
    await animateMatrixHorizontalPan(page, recorder);
    await recorder.hold(250);
  }

  await animateMarkedVerticalScroll(
    page,
    recorder,
    "data-readme-scroll-root",
    matrixMetrics.startScrollTop,
    matrixMetrics.endScrollTop,
    20,
    140
  );

  const governanceBox = await page.getByText("Governance", { exact: true }).boundingBox();
  if (!governanceBox) {
    await animateMarkedVerticalScroll(
      page,
      recorder,
      "data-readme-scroll-root",
      matrixMetrics.endScrollTop,
      matrixMetrics.endScrollTop + 240,
      4,
      120
    );
  }

  await recorder.hold(900);
  await clearMarkedScroller(page, "data-readme-scroll-root");
}

async function captureLookupFlow(page, recorder, baseUrl) {
  await waitForAppReady(page, baseUrl);
  await recorder.hold(280);
  const mapTitle = page.getByText("Official constituency boundary map");
  await recorder.wheel(760, 8, 160);
  await mapTitle.scrollIntoViewIfNeeded();
  await recorder.hold(520);
  await recorder.wheel(220, 4, 150);
  await recorder.hold(520);

  const previousSelection = await getSelectedConstituencyTitle(page);
  const targetBoundaryIndex = await page.evaluate(() => {
    const visiblePaths = Array.from(document.querySelectorAll("svg path"))
      .map((path, index) => {
        const rect = path.getBoundingClientRect();
        return {
          area: rect.width * rect.height,
          bottom: rect.bottom,
          fill: path.getAttribute("fill"),
          index,
          top: rect.top,
        };
      })
      .filter(
        (entry) =>
          entry.area >= 1800 &&
          entry.top >= 120 &&
          entry.bottom <= window.innerHeight - 120
      );

    if (!visiblePaths.length) {
      return 0;
    }

    const fillFrequency = visiblePaths.reduce((accumulator, entry) => {
      accumulator[entry.fill] = (accumulator[entry.fill] || 0) + 1;
      return accumulator;
    }, {});
    const baselineFill = Object.entries(fillFrequency).sort((left, right) => right[1] - left[1])[0]?.[0];
    const sortedCandidates = visiblePaths
      .filter((entry) => !baselineFill || entry.fill === baselineFill)
      .sort((left, right) => right.area - left.area);

    return (sortedCandidates[0] || visiblePaths[0]).index;
  });

  const targetBoundary = page.locator("svg path").nth(targetBoundaryIndex);
  const boundaryBox = await targetBoundary.boundingBox();
  if (!boundaryBox) {
    throw new Error("Unable to identify a visible constituency boundary for README capture");
  }

  await page.mouse.move(boundaryBox.x + boundaryBox.width / 2, boundaryBox.y + boundaryBox.height / 2);
  await recorder.hold(220);
  await page.mouse.click(
    boundaryBox.x + boundaryBox.width / 2,
    boundaryBox.y + boundaryBox.height / 2
  );

  await page.waitForFunction(
    (currentSelection) => {
      const eyebrow = Array.from(document.querySelectorAll("*")).find(
        (element) => {
          const text = (element.textContent || "").trim();
          return text === "Selected constituency" || text === "Hovered constituency";
        }
      );
      if (!eyebrow?.parentElement) {
        return false;
      }
      const textNodes = Array.from(eyebrow.parentElement.children)
        .map((element) => (element.textContent || "").trim())
        .filter(Boolean);
      return Boolean(textNodes[1] && textNodes[1] !== currentSelection);
    },
    previousSelection,
    { timeout: 15000 }
  );
  await recorder.hold(1400);
}

async function captureProfileFlow(page, recorder, baseUrl) {
  await waitForAppReady(page, baseUrl);
  await recorder.hold(550);

  const firstProfileButton = page.getByRole("button", { name: "Open profile" }).first();
  await recorder.click(firstProfileButton, 1250);
  await page.waitForLoadState("networkidle");
  await recorder.hold(700);
  await recorder.wheel(620, 7, 170);
  await recorder.hold(600);
  await recorder.wheel(500, 5, 170);
  await recorder.hold(1250);
}

async function captureFlow(browser, baseUrl, flowName, framesRoot) {
  const flow = flows[flowName];
  const flowFramesDir = path.join(framesRoot, flowName);
  await mkdir(flowFramesDir, { recursive: true });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  const recorder = new FrameRecorder(page, flowFramesDir);
  const homeUrl = `${baseUrl.replace(/\/$/, "")}/`;

  try {
    if (flowName === "compare") {
      await captureCompareFlow(page, recorder, homeUrl);
    } else if (flowName === "lookup") {
      await captureLookupFlow(page, recorder, homeUrl);
    } else if (flowName === "profile") {
      await captureProfileFlow(page, recorder, homeUrl);
    }
  } finally {
    await context.close();
  }

  const targetPath = path.join(outputDir, flow.file);
  await renderGif(flowFramesDir, targetPath);
  console.log(`Saved ${flow.title} to ${path.relative(projectRoot, targetPath)}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selectedFlows = resolveFlowNames(options.flow);

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const framesRoot = await mkdtemp(path.join(os.tmpdir(), "politiclear-readme-assets-"));
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    for (const flowName of selectedFlows) {
      console.log(`Capturing ${flowName} from ${options.baseUrl}`);
      await captureFlow(browser, options.baseUrl, flowName, framesRoot);
    }
  } finally {
    await browser.close();
    if (!options.keepFrames) {
      await rm(framesRoot, { recursive: true, force: true });
    } else {
      console.log(`Kept intermediate frames at ${framesRoot}`);
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
