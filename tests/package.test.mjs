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

test("cli-first share command is exposed to desktop and terminal entrypoints", async () => {
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");
  const cli = await readFile(new URL("../src/cli/index.ts", import.meta.url), "utf8");
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const preload = await readFile(new URL("../src/electron/preload.cts", import.meta.url), "utf8");

  assert.match(commands, /skillops share --repo/);
  assert.match(commands, /command === "share"/);
  assert.match(commands, /command === "doctor"/);
  assert.match(cli, /runSkillOpsCommand/);
  assert.match(electronMain, /"--cli"/);
  assert.match(electronMain, /installCliShim/);
  assert.match(electronMain, /system:installCli/);
  assert.match(preload, /installCli/);
});
