import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const appManifest = JSON.parse(await readFile(new URL("../app.manifest.json", import.meta.url), "utf8"));

test("package exposes desktop and cli entrypoints", () => {
  assert.equal(pkg.main, "dist/electron/main.js");
  assert.equal(pkg.bin.skillops, "dist/cli/index.js");
});

test("project is positioned as github-first skillops", () => {
  assert.match(pkg.description, /GitHub-first SkillOps/);
});

test("installer metadata is managed from the app manifest", () => {
  assert.equal(appManifest.packageName, pkg.name);
  assert.equal(appManifest.version, pkg.version);
  assert.equal(appManifest.description, pkg.description);
  assert.equal(appManifest.productName, "SkillOps");
  assert.match(appManifest.appId, /^com\./);
});
