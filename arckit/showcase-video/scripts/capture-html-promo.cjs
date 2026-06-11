const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has("--dry-run");
const localeArg = rawArgs.find((arg) => arg.startsWith("--locale="));
const locale = localeArg && localeArg.endsWith("=zh") ? "zh" : "en";
const suffix = locale === "zh" ? "-zh" : "";
const htmlPath = path.join(root, "arckit/showcase-video/html/promo/index.html");
const framesDir = path.join(root, `arckit/showcase-video/frames/html-promo${suffix}`);
const workDir = path.join(root, `arckit/showcase-video/work/html-capture${suffix}`);
const outputPath = path.join(root, `arckit/showcase-video/output/arcforge-promo${suffix}-silent.mp4`);

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

app.whenReady().then(async () => {
  try {
    await capture();
    app.quit();
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    app.exit(1);
  }
});

async function capture() {
  if (!fs.existsSync(htmlPath)) throw new Error(`Missing HTML animation: ${rel(htmlPath)}`);
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    backgroundColor: "#07111f",
    webPreferences: {
      offscreen: false,
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await win.loadFile(htmlPath, { query: { capture: "1", locale } });
  const spec = await win.webContents.executeJavaScript("window.demoVideoSpec");
  const width = Number(spec.width || 1920);
  const height = Number(spec.height || 1080);
  const fps = Number(spec.fps || 30);
  const duration = Number(spec.duration || 30);
  const frameCount = Math.max(1, Math.round(duration * fps));
  win.setSize(width, height);

  if (dryRun) {
    console.log(`Would capture ${frameCount} frames at ${width}x${height}, ${fps}fps, ${duration}s.`);
    console.log(`Locale: ${locale}`);
    console.log(`Frames: ${rel(framesDir)}`);
    console.log(`Output: ${rel(outputPath)}`);
    return;
  }

  for (const fileName of fs.readdirSync(framesDir)) {
    if (/^\d{4}\.png$/.test(fileName)) fs.unlinkSync(path.join(framesDir, fileName));
  }

  const manifest = ["frame,timeSeconds"];
  for (let i = 0; i < frameCount; i += 1) {
    const t = i / fps;
    await win.webContents.executeJavaScript(`window.renderFrame(${JSON.stringify(t)})`);
    await delay(8);
    const image = await win.webContents.capturePage({ x: 0, y: 0, width, height });
    const filePath = path.join(framesDir, `${String(i + 1).padStart(4, "0")}.png`);
    fs.writeFileSync(filePath, image.toPNG());
    manifest.push(`${path.basename(filePath)},${t.toFixed(3)}`);
    if ((i + 1) % fps === 0 || i === frameCount - 1) console.log(`Captured ${i + 1}/${frameCount}`);
  }
  fs.writeFileSync(path.join(workDir, "html-promo-frame-manifest.csv"), `${manifest.join("\n")}\n`, "utf8");

  run("ffmpeg", [
    "-y",
    "-framerate", String(fps),
    "-i", path.join(framesDir, "%04d.png"),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-vf", `scale=${width}:${height}:flags=lanczos`,
    outputPath
  ]);
  console.log(`Rendered ${rel(outputPath)} from ${frameCount} HTML frames.`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { encoding: "utf8" });
  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} failed${message ? `:\n${message}` : ""}`);
  }
  return result.stdout;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rel(value) {
  return path.relative(root, value).split(path.sep).join("/");
}
