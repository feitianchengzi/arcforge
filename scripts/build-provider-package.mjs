import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const sourcePackage = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const providerVersion = options.version ?? sourcePackage.version;
const buildCommit = options.commit ?? await gitCommit();
const workRoot = path.join(rootDir, "release", "provider-work", "arcforge-provider");
const outputRoot = path.join(rootDir, "release", "provider-release");
const artifactName = `arcforge-provider-${providerVersion}.tgz`;

assertVersion(providerVersion);
await assertBuilt();
const providerModule = await import(pathToFileURL(path.join(rootDir, "dist", "provider", "index.js")).href);
const apiVersion = providerModule.ARCFORGE_EMBEDDED_PROVIDER_API_VERSION;
const capabilities = [...providerModule.ARCFORGE_EMBEDDED_PROVIDER_CAPABILITIES];
await rm(path.dirname(workRoot), { recursive: true, force: true });
await rm(outputRoot, { recursive: true, force: true });
await mkdir(workRoot, { recursive: true });
await mkdir(outputRoot, { recursive: true });

for (const directory of ["provider", "core", "shared"]) {
  await cp(path.join(rootDir, "dist", directory), path.join(workRoot, "dist", directory), { recursive: true });
}
await cp(path.join(rootDir, "skills", "arcforge-on-demand"), path.join(workRoot, "skills", "arcforge-on-demand"), { recursive: true });
await cp(path.join(rootDir, "LICENSE"), path.join(workRoot, "LICENSE"));

const providerManifest = {
  schemaVersion: "arcforge-provider-package/v1",
  apiVersion,
  capabilities,
  providerVersion,
  buildCommit,
  releaseTag: options.tag ?? null,
  entrypoint: "dist/provider/index.js",
  loaderPath: "skills/arcforge-on-demand"
};
await writeFile(path.join(workRoot, "arcforge-provider.manifest.json"), `${JSON.stringify(providerManifest, null, 2)}\n`);
await writeFile(path.join(workRoot, "package.json"), `${JSON.stringify({
  name: "@arcforge/embedded-provider",
  version: providerVersion,
  description: "Stable embedded ArcForge provider for governed agent skill provisioning.",
  type: "module",
  exports: "./dist/provider/index.js",
  engines: sourcePackage.engines,
  license: sourcePackage.license,
  files: ["dist", "skills", "arcforge-provider.manifest.json", "LICENSE"]
}, null, 2)}\n`);

const { stdout } = await execFileAsync("npm", ["pack", "--json", "--pack-destination", outputRoot], { cwd: workRoot });
const packResult = JSON.parse(stdout);
if (!Array.isArray(packResult) || packResult.length !== 1 || !packResult[0]?.filename) throw new Error("npm pack did not return exactly one provider archive.");
const packedPath = path.join(outputRoot, packResult[0].filename);
const artifactPath = path.join(outputRoot, artifactName);
if (packedPath !== artifactPath) await rename(packedPath, artifactPath);
const artifactSha256 = sha256(await readFile(artifactPath));
const releaseManifest = { ...providerManifest, artifactName, artifactSha256 };
await writeFile(path.join(outputRoot, "arcforge-provider.manifest.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`);
const manifestSha256 = sha256(await readFile(path.join(outputRoot, "arcforge-provider.manifest.json")));
await writeFile(path.join(outputRoot, "checksums.txt"), `${artifactSha256}  ${artifactName}\n${manifestSha256}  arcforge-provider.manifest.json\n`);
console.log(JSON.stringify(releaseManifest, null, 2));

async function assertBuilt() {
  await readFile(path.join(rootDir, "dist", "provider", "index.js")).catch(() => {
    throw new Error("dist/provider/index.js is missing. Run npm run build:cli first.");
  });
}

async function gitCommit() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: rootDir });
  return stdout.trim();
}

function assertVersion(value) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) throw new Error(`Invalid provider package version: ${value}`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--version") result.version = args[++index];
    else if (args[index] === "--commit") result.commit = args[++index];
    else if (args[index] === "--tag") result.tag = args[++index];
  }
  return result;
}
