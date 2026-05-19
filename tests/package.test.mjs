import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("package exposes desktop and cli entrypoints", () => {
  assert.equal(pkg.main, "dist/electron/main.js");
  assert.equal(pkg.bin.skillops, "dist/cli/index.js");
});

test("project is positioned as github-first skillops", () => {
  assert.match(pkg.description, /GitHub-first SkillOps/);
});
