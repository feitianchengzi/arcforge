#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const rawArgs = process.argv.slice(2);
const localeArg = rawArgs.find((arg) => arg.startsWith("--locale="));
const locale = localeArg && localeArg.endsWith("=zh") ? "zh" : "en";
const suffix = locale === "zh" ? "-zh" : "";
const htmlPath = path.join(root, "arckit/showcase-video/html/promo/index.html");
const jsPath = path.join(root, "arckit/showcase-video/html/promo/animation.js");
const framesDir = path.join(root, `arckit/showcase-video/frames/html-promo${suffix}`);
const outputPath = path.join(root, `arckit/showcase-video/output/arcforge-promo${suffix}-silent.mp4`);

if (!existsSync(htmlPath)) fail(`Missing HTML animation: ${rel(htmlPath)}`);
if (!existsSync(jsPath)) fail(`Missing animation script: ${rel(jsPath)}`);

const source = readFileSync(jsPath, "utf8");
if (!/window\.demoVideoSpec\s*=/.test(source)) fail("Missing window.demoVideoSpec in animation.js");
if (!/window\.renderFrame\s*=\s*function/.test(source)) fail("Missing window.renderFrame(timeSeconds) in animation.js");
const width = 1920;
const height = 1080;
const fps = Number(source.match(/const FPS\s*=\s*(\d+)/)?.[1] || 30);
const duration = Number(source.match(/const DURATION\s*=\s*(\d+)/)?.[1] || 30);
const frameCount = Math.max(1, Math.round(duration * fps));
console.log(`Would capture ${frameCount} HTML frames at ${width}x${height}, ${fps}fps, ${duration}s.`);
console.log(`Locale: ${locale}`);
console.log(`HTML: ${rel(htmlPath)}`);
console.log(`Frames: ${rel(framesDir)}`);
console.log(`Silent output: ${rel(outputPath)}`);

function rel(value) {
  return path.relative(root, value).split(path.sep).join("/");
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
