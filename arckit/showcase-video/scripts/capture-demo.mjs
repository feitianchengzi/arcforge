#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";

const root = process.cwd();
const planPath = path.join(root, "arckit/showcase-video/plan.json");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const requestedVariant = valueAfter("--variant");

if (!existsSync(planPath)) {
  fail(`Missing capture plan: ${rel(planPath)}`);
}

const plan = JSON.parse(readFileSync(planPath, "utf8"));
const variants = requestedVariant
  ? plan.variants.filter((item) => item.locale === requestedVariant)
  : plan.variants;

if (variants.length === 0) {
  fail(`No matching variant for --variant ${requestedVariant}`);
}

for (const dir of ["frames", "output", "work", "scripts"]) {
  mkdirSync(path.join(root, "arckit/showcase-video", dir), { recursive: true });
}

for (const variant of variants) {
  await captureVariant(variant);
}

console.log("Demo capture complete.");

async function captureVariant(variant) {
  console.log(`\n== ${variant.label ?? variant.locale} ==`);
  const framesDir = abs(variant.framesDir);
  mkdirSync(framesDir, { recursive: true });

  if (!dryRun) {
    setAppLocale(variant.locale);
    activateApp();
    if (plan.app.reloadAfterLocaleChange) {
      reloadApp();
      sleep(plan.window.reloadDelayMs ?? 1600);
    }
  }

  const framePaths = [];
  for (let index = 0; index < plan.frames.length; index += 1) {
    const frame = plan.frames[index];
    const framePath = path.join(framesDir, `${String(index + 1).padStart(2, "0")}-${frame.id}.png`);
    framePaths.push(framePath);

    if (dryRun) {
      console.log(`Would capture ${rel(framePath)}`);
      continue;
    }

    activateApp();
    const windowInfo = findWindow();
    clickRelative(windowInfo.bounds, frame.click);
    sleep(plan.window.afterClickDelayMs ?? 700);
    captureWindow(windowInfo.id, framePath);
    console.log(`Captured ${rel(framePath)}`);
  }

  if (dryRun) return;

  validateFrames(framePaths);
  buildGif(framePaths, abs(variant.output));
  updateReadme(variant);
}

function setAppLocale(locale) {
  const statePath = expandHome(plan.app.statePath);
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { version: 1 };
  state.language = locale;
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`Set locale ${locale} in ${statePath}`);
}

function activateApp() {
  run("osascript", ["-e", `tell application "${plan.app.owner}" to activate`]);
  sleep(plan.window.activateDelayMs ?? 600);
}

function reloadApp() {
  runSwift(`
import CoreGraphics
import Foundation
let src = CGEventSource(stateID: .hidSystemState)
let down = CGEvent(keyboardEventSource: src, virtualKey: 15, keyDown: true)!
down.flags = .maskCommand
down.post(tap: .cghidEventTap)
usleep(80000)
let up = CGEvent(keyboardEventSource: src, virtualKey: 15, keyDown: false)!
up.flags = .maskCommand
up.post(tap: .cghidEventTap)
`);
}

function findWindow() {
  const output = runSwift(`
import CoreGraphics
import Foundation
let wins = (CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID) as NSArray? as? [[String: Any]]) ?? []
for w in wins {
  let owner = w[kCGWindowOwnerName as String] as? String ?? ""
  let title = w[kCGWindowName as String] as? String ?? ""
  if owner == "${escapeSwift(plan.app.owner)}" && title == "${escapeSwift(plan.app.title)}" {
    let id = w[kCGWindowNumber as String] as? UInt32 ?? 0
    let b = w[kCGWindowBounds as String] as? [String: CGFloat] ?? [:]
    print("\\(id) \\(Int(b["X"] ?? 0)) \\(Int(b["Y"] ?? 0)) \\(Int(b["Width"] ?? 0)) \\(Int(b["Height"] ?? 0))")
    exit(0)
  }
}
exit(2)
`);
  const [id, x, y, width, height] = output.trim().split(/\s+/).map(Number);
  if (!id) fail(`Could not find ${plan.app.owner} window titled ${plan.app.title}`);
  return { id, bounds: { x, y, width, height } };
}

function clickRelative(bounds, point) {
  const x = Math.round(bounds.x + point.x);
  const y = Math.round(bounds.y + point.y);
  runSwift(`
import CoreGraphics
import Foundation
let p = CGPoint(x: ${x}, y: ${y})
let src = CGEventSource(stateID: .hidSystemState)
CGEvent(mouseEventSource: src, mouseType: .mouseMoved, mouseCursorPosition: p, mouseButton: .left)?.post(tap: .cghidEventTap)
usleep(100000)
CGEvent(mouseEventSource: src, mouseType: .leftMouseDown, mouseCursorPosition: p, mouseButton: .left)!.post(tap: .cghidEventTap)
usleep(100000)
CGEvent(mouseEventSource: src, mouseType: .leftMouseUp, mouseCursorPosition: p, mouseButton: .left)!.post(tap: .cghidEventTap)
`);
}

function captureWindow(windowId, filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  run("screencapture", ["-x", "-l", String(windowId), filePath]);
}

function validateFrames(framePaths) {
  const stats = framePaths.map((filePath) => ({ filePath, ...readPngStats(filePath) }));
  const first = stats[0];
  for (const item of stats) {
    if (item.width !== first.width || item.height !== first.height) {
      fail(`Frame size mismatch: ${rel(item.filePath)} is ${item.width}x${item.height}, expected ${first.width}x${first.height}`);
    }
    if (JSON.stringify(item.bbox) !== JSON.stringify(first.bbox)) {
      fail(`Frame window bbox mismatch: ${rel(item.filePath)} is ${JSON.stringify(item.bbox)}, expected ${JSON.stringify(first.bbox)}`);
    }
  }
  console.log(`Validated ${stats.length} frames at ${first.width}x${first.height}.`);
}

function buildGif(framePaths, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const ffmpegArgs = ["-y"];
  for (const framePath of framePaths) {
    ffmpegArgs.push("-loop", "1", "-t", String(plan.gif.frameSeconds), "-i", framePath);
  }

  const filters = framePaths.map((_, index) =>
    `[${index}:v]scale=${plan.gif.width}:${plan.gif.height}:force_original_aspect_ratio=decrease,` +
    `pad=${plan.gif.width}:${plan.gif.height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[v${index}]`
  );
  const concatInputs = framePaths.map((_, index) => `[v${index}]`).join("");
  const filter = `${filters.join(";")};${concatInputs}concat=n=${framePaths.length}:v=1:a=0,fps=${plan.gif.fps},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`;

  ffmpegArgs.push("-filter_complex", filter, "-loop", "0", outputPath);
  run("ffmpeg", ffmpegArgs);
  console.log(`Built ${rel(outputPath)}`);
}

function updateReadme(variant) {
  const readmePath = abs(variant.readme);
  if (!existsSync(readmePath)) return;
  const outputRel = toPosix(path.relative(path.dirname(readmePath), abs(variant.output)));
  const imageLine = `![${variant.readmeAlt}](${outputRel})`;
  const original = readFileSync(readmePath, "utf8");
  const altContains = plan.readme?.replaceImageAltContains ?? "ArcForge";
  const pattern = new RegExp(`!\\\\[[^\\\\]]*${escapeRegExp(altContains)}[^\\\\]]*\\\\]\\\\([^)]*\\\\)`);
  const next = pattern.test(original) ? original.replace(pattern, imageLine) : `${original.trimEnd()}\n\n${imageLine}\n`;
  if (next !== original) {
    writeFileSync(readmePath, next, "utf8");
    console.log(`Updated ${rel(readmePath)}`);
  }
}

function readPngStats(filePath) {
  const data = readFileSync(filePath);
  if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") fail(`Not a PNG: ${rel(filePath)}`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const chunks = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
    } else if (type === "IDAT") {
      chunks.push(chunk);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8 || colorType !== 6) fail(`Unsupported PNG format for bbox validation: ${rel(filePath)}`);
  const pixels = inflateRgba(Buffer.concat(chunks), width, height);
  return { width, height, bbox: effectiveBbox(pixels, width, height) };
}

function inflateRgba(compressed, width, height) {
  const raw = zlib.inflateSync(compressed);
  const stride = width * 4;
  const rows = [];
  let offset = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[offset++];
    const row = Buffer.from(raw.subarray(offset, offset + stride));
    offset += stride;
    const out = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const left = i >= 4 ? out[i - 4] : 0;
      const up = prev[i];
      const upLeft = i >= 4 ? prev[i - 4] : 0;
      let value = row[i];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) fail(`Unsupported PNG filter: ${filter}`);
      out[i] = value & 255;
    }
    rows.push(out);
    prev = out;
  }
  return rows;
}

function effectiveBbox(rows, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = rows[y];
    for (let x = 0; x < width; x += 1) {
      const i = x * 4;
      const r = row[i];
      const g = row[i + 1];
      const b = row[i + 2];
      const a = row[i + 3];
      if (a > 10 && (r > 16 || g > 16 || b > 16)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) fail("No effective pixels found in PNG.");
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function runSwift(source) {
  const cache = path.join(root, "arckit/showcase-video/work/clang-module-cache");
  mkdirSync(cache, { recursive: true });
  return run("env", [`CLANG_MODULE_CACHE_PATH=${cache}`, "swift", "-e", source]);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { encoding: "utf8" });
  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    fail(`${command} failed${message ? `:\n${message}` : ""}`);
  }
  return result.stdout;
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function abs(value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function rel(value) {
  return toPosix(path.relative(root, value));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function expandHome(value) {
  return value.startsWith("~/") ? path.join(process.env.HOME ?? "", value.slice(2)) : value;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function escapeSwift(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
