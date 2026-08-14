import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

test("embedded provider isolates state, confirms fresh plans, and removes only proven managed paths", async () => {
  await execFileAsync(process.execPath, [path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"), "-p", path.join(repoRoot, "tsconfig.cli.json")], { cwd: repoRoot });
  const provider = await import(`${pathToFileURL(path.join(repoRoot, "dist", "provider", "index.js")).href}?test=${Date.now()}`);
  const fixture = await mkdtemp(path.join(tmpdir(), "arcforge-provider-"));
  const sourceRoot = path.join(fixture, "source");
  const consumerRoot = path.join(fixture, "consumer");
  const stateRoot = path.join(fixture, "state");
  const homeDir = path.join(fixture, "home");
  const decoyStateRoot = path.join(fixture, "decoy-state");
  const previousArcForgeHome = process.env.ARCFORGE_HOME;
  process.env.ARCFORGE_HOME = decoyStateRoot;
  try {
    await mkdir(path.join(sourceRoot, "skills", "rare-tool"), { recursive: true });
    await mkdir(consumerRoot, { recursive: true });
    await writeFile(path.join(sourceRoot, "skills", "rare-tool", "SKILL.md"), "---\nname: rare-tool\ndescription: Provider fixture.\n---\n\n# Rare tool\n");
    await writeFile(path.join(sourceRoot, "arcforge.config.json"), `${JSON.stringify({
      version: 1,
      sourceDir: "skills",
      profiles: [{ name: "default", skills: ["rare-tool"], targets: ["codex"] }]
    }, null, 2)}\n`);
    await writeFile(path.join(sourceRoot, "arcforge.skill-project.json"), `${JSON.stringify({
      version: 1,
      sourceDir: "skills",
      availability: { skills: [{ path: "skills/rare-tool", mode: "user-on-demand", aliases: ["rare"] }] }
    }, null, 2)}\n`);

    const options = { sourceRoot, consumerRoot, stateRoot, homeDir, profile: "default", agentTargetIds: ["codex"] };
    const planned = await provider.createProvisioningPlan(options);
    assert.match(planned.planDigest, /^[a-f0-9]{64}$/);
    const catalogPath = planned.plan.items[0].destinations[0].path;
    assert.equal(catalogPath.startsWith(path.join(stateRoot, "catalog")), true);
    assert.equal(catalogPath.startsWith(path.join(homeDir, ".arcforge")), false);

    await assert.rejects(
      provider.applyProvisioningPlan({ ...options, expectedPlanDigest: "0".repeat(64), confirm: true }),
      /plan changed after confirmation/
    );
    await provider.applyProvisioningPlan({ ...options, expectedPlanDigest: planned.planDigest, confirm: true });
    assert.equal((await provider.listProvisioningRelations({ consumerRoot, stateRoot, sourceRoot })).length, 1);
    await access(path.join(stateRoot, "catalog", "index.json"));
    await assert.rejects(access(path.join(decoyStateRoot, "projects")));

    const removal = await provider.removeManagedProvisioning({ consumerRoot, stateRoot, sourceRoot, managedPaths: [catalogPath] });
    assert.match(removal.confirmationDigest, /^[a-f0-9]{64}$/);
    const result = await provider.removeManagedProvisioning({
      consumerRoot,
      stateRoot,
      sourceRoot,
      managedPaths: [catalogPath],
      confirmationDigest: removal.confirmationDigest,
      confirm: true
    });
    assert.deepEqual(result.removedPaths, [catalogPath]);
    await assert.rejects(access(catalogPath));
    const catalog = JSON.parse(await readFile(path.join(stateRoot, "catalog", "index.json"), "utf8"));
    assert.deepEqual(catalog.entries, []);
  } finally {
    if (previousArcForgeHome === undefined) delete process.env.ARCFORGE_HOME;
    else process.env.ARCFORGE_HOME = previousArcForgeHome;
    await rm(fixture, { recursive: true, force: true });
  }
});
