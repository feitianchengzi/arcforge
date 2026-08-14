import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const validator = fileURLToPath(new URL("../scripts/validate-release-trigger.mjs", import.meta.url));

test("release trigger validator consumes existing governed tags without creating them", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "arcforge-release-contract-"));
  try {
    await git(repo, ["init", "-b", "main"]);
    await git(repo, ["config", "user.email", "test@example.com"]);
    await git(repo, ["config", "user.name", "ArcForge Test"]);
    await mkdir(path.join(repo, "nested"), { recursive: true });
    await writeFile(path.join(repo, "app.manifest.json"), `${JSON.stringify({ version: "1.2.3" })}\n`);
    await git(repo, ["add", "app.manifest.json"]);
    await git(repo, ["commit", "-m", "fixture"]);
    await git(repo, ["tag", "tf/v1.2.3-b1"]);

    const internal = JSON.parse((await run(repo, "tf/v1.2.3-b1")).stdout);
    assert.equal(internal.channel, "tf");
    assert.equal(internal.packageVersion, "1.2.3-tf.b1");
    await git(repo, ["tag", "beta/v1.2.3-rc1"]);
    await assert.rejects(run(repo, "beta/v1.2.3-rc1"), /requires release\/v1\.2\.3/);

    await git(repo, ["branch", "release/v1.2.3"]);
    const beta = JSON.parse((await run(repo, "beta/v1.2.3-rc1")).stdout);
    assert.equal(beta.channel, "beta");
    assert.equal(beta.baseline, "refs/heads/release/v1.2.3");
    await assert.rejects(run(repo, "tf/v1.2.3-b0"), /must match tf/);
    assert.deepEqual((await git(repo, ["tag", "--list"])).stdout.trim().split("\n").sort(), ["beta/v1.2.3-rc1", "tf/v1.2.3-b1"]);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

function run(cwd, tag) {
  return execFileAsync(process.execPath, [validator, "--tag", tag], { cwd });
}

function git(cwd, args) {
  return execFileAsync("git", args, { cwd });
}
