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
  assert.match(commands, /Local-first, GitHub-first governance/);
  assert.match(commands, /skillops <command> --help/);
  assert.match(commands, /SkillOps CLI - share/);
  assert.match(commands, /One-time skill selection/);
  assert.match(commands, /command === "share"/);
  assert.match(commands, /command === "doctor"/);
  assert.match(commands, /requiresConfirm/);
  assert.match(cli, /runSkillOpsCommand/);
  assert.match(electronMain, /"--cli"/);
  assert.match(electronMain, /installCliShim/);
  assert.match(electronMain, /system:installCli/);
  assert.match(preload, /installCli/);
});

test("share delivery failures keep manual recovery guidance", async () => {
  const shareCore = await readFile(new URL("../src/core/share.ts", import.meta.url), "utf8");

  assert.match(shareCore, /Share delivery failed during/);
  assert.match(shareCore, /manual commands below/);
  assert.match(shareCore, /errorStage/);
  assert.match(shareCore, /manualCommands/);
});

test("release workflow publishes cli-only install assets", async () => {
  const workflow = await readFile(new URL("../.github/workflows/package.yml", import.meta.url), "utf8");
  const buildScript = await readFile(new URL("../scripts/build-cli-package.mjs", import.meta.url), "utf8");
  const pkgText = await readFile(new URL("../package.json", import.meta.url), "utf8");

  assert.match(pkgText, /"build:cli"/);
  assert.match(workflow, /CLI package/);
  assert.match(workflow, /darwin-x64 darwin-arm64 linux-x64/);
  assert.match(workflow, /skillops-cli-\$\{target\}\.tar\.gz/);
  assert.match(workflow, /skillops-cli-win-x64\.zip/);
  assert.match(workflow, /checksums\.txt/);
  assert.match(buildScript, /install\.sh/);
  assert.match(buildScript, /install\.ps1/);
  assert.match(buildScript, /while \[ -h "\$PRG" \]/);
  assert.match(buildScript, /command -v node/);
  assert.match(buildScript, /\[ "\$node_major" -lt "\$required_node_major" \]/);
  assert.match(buildScript, /rm -f "\$shim"/);
  assert.match(buildScript, /cat > "\$shim"/);
  assert.doesNotMatch(buildScript, /ln -sf "\$cli_dir\/bin\/skillops" "\$bin_dir\/skillops"/);
  assert.match(buildScript, /Get-Command node/);
  assert.match(buildScript, /\$CliEntry = Join-Path \$CliDir "dist\\\\cli\\\\index\.js"/);
  assert.match(buildScript, /Remove-Item -LiteralPath \$Shim -Force/);
});
