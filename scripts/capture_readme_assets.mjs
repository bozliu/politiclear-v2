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
  await recorder.hold(650);

  const addButtons = page.getByRole("button", { name: "Add to compare" });
  await recorder.click(addButtons.first(), 900);
  await recorder.click(addButtons.first(), 950);

  const compareButton = page.getByRole("button", {
    name: /Compare 2 selected profiles/i,
  });
  await recorder.click(compareButton, 1200);
  await page.waitForFunction(() => document.title === "CandidateCompare");
  await recorder.hold(1400);
}

async function captureLookupFlow(page, recorder, baseUrl) {
  await waitForAppReady(page, baseUrl);
  await recorder.hold(500);

  const input = page.getByRole("textbox", {
    name: /Search constituency, town, or routing-key Eircode/i,
  });
  const mapTitle = page.getByText("Official constituency boundary map");
  const routingKeyMatch = page.getByText("Routing-key match", { exact: true });
  const autoAppliedHint = page.getByText(/Applied automatically from/i);
  const officialHandoff = page.getByText("Official handoff", { exact: true });
  const officialLookupButton = page.getByRole("button", {
    name: /Use official lookup/i,
  });

  await recorder.clearAndType(input, "D04", 160, 1350);
  await routingKeyMatch.waitFor({ state: "visible" });
  await autoAppliedHint.waitFor({ state: "visible" });
  await recorder.hold(700);

  await recorder.wheel(760, 8, 180);
  await mapTitle.scrollIntoViewIfNeeded();
  await recorder.hold(900);

  const hoverTargetIndex = await page.evaluate(() => {
    const paths = Array.from(document.querySelectorAll("svg path"));
    const minimumArea = 1800;
    const verticalPadding = 120;

    const visibleTarget = paths.findIndex((path) => {
      const rect = path.getBoundingClientRect();
      return (
        rect.width * rect.height >= minimumArea &&
        rect.top >= verticalPadding &&
        rect.bottom <= window.innerHeight - verticalPadding
      );
    });

    return visibleTarget >= 0 ? visibleTarget : 0;
  });

  await page.locator("svg path").nth(hoverTargetIndex).hover();
  await page.getByText("Hovered constituency").waitFor({ state: "visible" });
  await recorder.hold(1100);

  await recorder.wheel(-760, 8, 180);
  await input.scrollIntoViewIfNeeded();
  await recorder.hold(500);
  await recorder.clearAndType(input, "12 Main Street Dublin", 90, 1450);
  await officialHandoff.waitFor({ state: "visible" });
  await officialLookupButton.waitFor({ state: "visible" });
  await recorder.hold(1200);
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
