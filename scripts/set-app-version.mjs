import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error("Usage: node scripts/set-app-version.mjs <major.minor.patch>");
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  manifest: path.join(rootDir, "app.manifest.json"),
  packageJson: path.join(rootDir, "package.json"),
  packageLock: path.join(rootDir, "package-lock.json")
};

const manifest = JSON.parse(await readFile(files.manifest, "utf8"));
manifest.version = version;
await writeFile(files.manifest, `${JSON.stringify(manifest, null, 2)}\n`);

const pkg = JSON.parse(await readFile(files.packageJson, "utf8"));
pkg.version = version;
await writeFile(files.packageJson, `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(await readFile(files.packageLock, "utf8"));
lock.version = version;
if (lock.packages?.[""]) {
  lock.packages[""].version = version;
}
await writeFile(files.packageLock, `${JSON.stringify(lock, null, 2)}\n`);

console.log(`Set app version to ${version}`);
