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
  const core = await import(`${pathToFileURL(path.join(repoRoot, "dist", "core", "sources.js")).href}?test=${Date.now()}`);
  const projectStore = await import(`${pathToFileURL(path.join(repoRoot, "dist", "core", "project-store.js")).href}?test=${Date.now()}`);
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
    await mkdir(path.join(sourceRoot, "skills", "ambient-tool"), { recursive: true });
    await mkdir(path.join(sourceRoot, "definition", "skills", "_declared_shared"), { recursive: true });
    await mkdir(consumerRoot, { recursive: true });
    await writeFile(path.join(sourceRoot, "skills", "rare-tool", "SKILL.md"), "---\nname: rare-tool\ndescription: Provider fixture.\nversion: 1.2.0\n---\n\n# Rare tool\n");
    await writeFile(path.join(sourceRoot, "skills", "ambient-tool", "SKILL.md"), "---\nname: ambient-tool\ndescription: Ambient provider fixture.\n---\n");
    await writeFile(path.join(sourceRoot, "definition", "skills", "_declared_shared", "contract.md"), "declared shared contract\n");
    await writeFile(path.join(sourceRoot, "arcforge.config.json"), `${JSON.stringify({
      version: 1,
      sourceDir: "skills",
      profiles: [{ name: "default", skills: ["rare-tool", "ambient-tool"], targets: ["codex"] }]
    }, null, 2)}\n`);
    await writeFile(path.join(sourceRoot, "arcforge.skill-project.json"), `${JSON.stringify({
      version: 1,
      sourceDir: "skills",
      availability: { defaultMode: "user-ambient", skills: [{ path: "skills/rare-tool", mode: "user-on-demand", aliases: ["rare"] }] }
    }, null, 2)}\n`);
    await writeFile(path.join(sourceRoot, "payload.manifest.json"), `${JSON.stringify({
      schemaVersion: "fixture-payload/v1",
      sourceCommit: "0123456789abcdef0123456789abcdef01234567",
      sourceManifestDigest: "f".repeat(64),
      sharedAssetPaths: ["definition/skills/_declared_shared"]
    }, null, 2)}\n`);

    const options = { sourceRoot, consumerRoot, stateRoot, homeDir, profile: "default", agentTargetIds: ["codex"] };
    const planned = await provider.createProvisioningPlan(options);
    const canonicalPlan = await core.createAvailabilityPlanFromSource({
      root: consumerRoot,
      from: sourceRoot,
      stateRoot,
      homeDir,
      profile: "default",
      agentTargetIds: ["codex"],
      declaredSharedAssetPaths: ["definition/skills/_declared_shared"],
      sourceProvenance: {
        sourceIdentity: `payload:fixture-payload/v1:0123456789abcdef0123456789abcdef01234567:${"f".repeat(64)}`,
        sourceCommit: "0123456789abcdef0123456789abcdef01234567"
      }
    });
    assert.deepEqual(planned.plan, canonicalPlan);
    assert.match(planned.planDigest, /^[a-f0-9]{64}$/);
    assert.equal(planned.plan.sourceProvenance.sourceCommit, "0123456789abcdef0123456789abcdef01234567");
    assert.match(planned.plan.sourceIdentity, /^payload:fixture-payload\/v1:/);
    assert.deepEqual((await provider.inspectProvider()).capabilities, ["declared-shared-assets/v1", "source-upgrade-recovery/v1", "conflict-reinstall-recovery/v1"]);
    assert.equal(planned.plan.assets.length, 1);
    assert.equal(planned.plan.assets[0].sourcePath, "definition/skills/_declared_shared");
    assert.equal(planned.sharedAssets.length, 1);
    assert.equal(planned.sharedAssets[0].name, "_declared_shared");
    assert.equal(planned.sharedAssets[0].sourcePath, "definition/skills/_declared_shared");
    assert.deepEqual(planned.sharedAssets[0].destinations, [path.join(homeDir, ".codex", "skills", "_declared_shared")]);
    const catalogPath = planned.plan.items.find((item) => item.skill === "rare-tool").destinations[0].path;
    assert.equal(catalogPath, path.join(stateRoot, "catalog", "rare-tool"));
    assert.equal(catalogPath.startsWith(path.join(stateRoot, "catalog")), true);
    assert.equal(catalogPath.startsWith(path.join(homeDir, ".arcforge")), false);

    await assert.rejects(
      provider.applyProvisioningPlan({ ...options, expectedPlanDigest: "0".repeat(64), confirm: true }),
      /plan changed after confirmation/
    );
    await writeFile(path.join(sourceRoot, "definition", "skills", "_declared_shared", "contract.md"), "changed after confirmation\n");
    await assert.rejects(
      provider.applyProvisioningPlan({ ...options, expectedPlanDigest: planned.planDigest, confirm: true }),
      /plan changed after confirmation/
    );
    await writeFile(path.join(sourceRoot, "definition", "skills", "_declared_shared", "contract.md"), "declared shared contract\n");
    const before = await provider.driftProvisioningPlan(options);
    assert.equal(before.items.find((item) => item.kind === "asset" && item.skill === "_declared_shared").status, "missing");
    const applied = await provider.applyProvisioningPlan({ ...options, expectedPlanDigest: planned.planDigest, confirm: true });
    assert.deepEqual(applied.result.copiedAssets, ["_declared_shared"]);
    await access(path.join(homeDir, ".codex", "skills", "_declared_shared", "contract.md"));
    const after = await provider.driftProvisioningPlan(options);
    assert.equal(after.items.find((item) => item.kind === "asset" && item.skill === "_declared_shared").status, "same");
    assert.equal((await provider.listProvisioningRelations({ consumerRoot, stateRoot, sourceRoot })).length, 1);
    if (process.platform === "win32" || process.platform === "darwin") {
      assert.equal((await provider.listProvisioningRelations({ consumerRoot, stateRoot, sourceRoot: sourceRoot.toUpperCase() })).length, 1);
    }
    const relation = (await provider.listProvisioningRelations({ consumerRoot, stateRoot, sourceRoot }))[0];
    assert.deepEqual(relation.availabilityAssets, [{
      name: "_declared_shared",
      sourcePath: "definition/skills/_declared_shared",
      destinations: [path.join(homeDir, ".codex", "skills", "_declared_shared")]
    }]);
    assert.deepEqual(relation.provisioningEvidence.providerCapabilities, ["conflict-reinstall-recovery/v1", "declared-shared-assets/v1", "source-upgrade-recovery/v1"]);
    assert.equal(relation.provisioningEvidence.targets.some((item) => item.kind === "loader" && item.name === "arcforge-on-demand"), true);
    assert.equal(relation.provisioningEvidence.targets.every((item) => /^[a-f0-9]{64}$/.test(item.contentDigest)), true);

    await rm(catalogPath, { recursive: true, force: true });
    const repairAssessment = await provider.assessProvisioningUpgrade(options);
    assert.equal(repairAssessment.canProceed, true);
    assert.equal(repairAssessment.writeState, "not_started");
    assert.equal(repairAssessment.items.some((item) => item.disposition === "managed-repair" && item.path === catalogPath), true);
    await provider.applyProvisioningPlan({ ...options, expectedPlanDigest: (await provider.createProvisioningPlan(options)).planDigest, confirm: true });

    await writeFile(path.join(homeDir, ".codex", "skills", "ambient-tool", "SKILL.md"), "local edit\n");
    const conflictAssessment = await provider.assessProvisioningUpgrade(options);
    assert.equal(conflictAssessment.canProceed, false);
    assert.equal(conflictAssessment.canBackupAndRestore, true);
    assert.equal(conflictAssessment.items.some((item) => item.disposition === "local-content-conflict" && item.name === "ambient-tool"), true);
    const recovered = await provider.recoverProvisioningUpgrade({
      ...options,
      expectedAssessmentDigest: conflictAssessment.assessmentDigest,
      action: "backup-and-restore",
      backupRoot: path.join(fixture, "recovery-backups"),
      confirm: true
    });
    assert.equal(await readFile(path.join(homeDir, ".codex", "skills", "ambient-tool", "SKILL.md"), "utf8"), "---\nname: ambient-tool\ndescription: Ambient provider fixture.\n---\n");
    assert.equal(await readFile(path.join(recovered.backupPath, "items", "001-ambient-tool", "SKILL.md"), "utf8"), "local edit\n");
    assert.equal((await provider.assessProvisioningUpgrade(options)).canProceed, true);

    const renamedConsumerRoot = path.join(fixture, "renamed-consumer");
    const renamedOptions = { ...options, consumerRoot: renamedConsumerRoot };
    await writeFile(path.join(homeDir, ".codex", "skills", "ambient-tool", "SKILL.md"), "renamed consumer local edit\n");
    await rm(catalogPath, { recursive: true, force: true });
    const unmanagedAssessment = await provider.assessProvisioningUpgrade(renamedOptions);
    assert.equal(unmanagedAssessment.relationIds.length, 0);
    assert.equal(unmanagedAssessment.canProceed, false);
    assert.equal(unmanagedAssessment.canBackupAndRestore, false);
    assert.equal(unmanagedAssessment.canBackupAndReinstall, true);
    assert.deepEqual(unmanagedAssessment.items.map((item) => [item.name, item.disposition]), [["rare-tool", "managed-repair"], ["ambient-tool", "unmanaged-conflict"]]);
    await writeFile(path.join(homeDir, ".codex", "skills", "ambient-tool", "SKILL.md"), "stale confirmation edit\n");
    await assert.rejects(
      provider.recoverProvisioningUpgrade({
        ...renamedOptions,
        expectedAssessmentDigest: unmanagedAssessment.assessmentDigest,
        action: "backup-and-reinstall",
        backupRoot: path.join(fixture, "stale-reinstall-backups"),
        confirm: true
      }),
      /assessment changed after confirmation/
    );
    const freshUnmanagedAssessment = await provider.assessProvisioningUpgrade(renamedOptions);
    const reinstalled = await provider.recoverProvisioningUpgrade({
      ...renamedOptions,
      expectedAssessmentDigest: freshUnmanagedAssessment.assessmentDigest,
      action: "backup-and-reinstall",
      backupRoot: path.join(fixture, "reinstall-backups"),
      confirm: true
    });
    assert.equal(await readFile(path.join(homeDir, ".codex", "skills", "ambient-tool", "SKILL.md"), "utf8"), "---\nname: ambient-tool\ndescription: Ambient provider fixture.\n---\n");
    assert.equal(await readFile(path.join(reinstalled.backupPath, "items", "001-ambient-tool", "SKILL.md"), "utf8"), "stale confirmation edit\n");
    assert.equal((await provider.listProvisioningRelations({ consumerRoot: renamedConsumerRoot, stateRoot, sourceRoot })).length, 1);
    assert.equal((await provider.assessProvisioningUpgrade(renamedOptions)).canProceed, true);

    const legacyCatalogPath = path.join(stateRoot, "catalog", "legacy-source-key", "rare-tool");
    const legacyRelation = {
      ...(await provider.listProvisioningRelations({ consumerRoot, stateRoot, sourceRoot }))[0],
      availabilityItems: relation.availabilityItems.map((item) => item.skill === "rare-tool" ? { ...item, destinations: [legacyCatalogPath] } : item),
      provisioningEvidence: undefined
    };
    await projectStore.saveLocalProjectAppliedSources(consumerRoot, [legacyRelation], { stateRoot });
    await rm(catalogPath, { recursive: true, force: true });
    const loaderPath = planned.plan.loaderTargets[0].path;
    await writeFile(path.join(loaderPath, "SKILL.md"), "provider-managed loader update\n");
    await mkdir(legacyCatalogPath, { recursive: true });
    await writeFile(path.join(legacyCatalogPath, "SKILL.md"), "legacy local edit\n");
    const unverifiedLegacy = await provider.assessProvisioningUpgrade(options);
    const legacyConflict = unverifiedLegacy.items.find((item) => item.path === legacyCatalogPath);
    assert.equal(legacyConflict.disposition, "unverified-managed");
    assert.equal(legacyConflict.files.some((item) => item.path === "SKILL.md" && item.status === "changed"), true);
    assert.equal(unverifiedLegacy.canBackupAndRestore, true);
    await provider.recoverProvisioningUpgrade({
      ...options,
      expectedAssessmentDigest: unverifiedLegacy.assessmentDigest,
      action: "backup-and-restore",
      backupRoot: path.join(fixture, "legacy-recovery-backups"),
      confirm: true
    });
    assert.match(await readFile(path.join(legacyCatalogPath, "SKILL.md"), "utf8"), /Rare tool/);

    await mkdir(catalogPath, { recursive: true });
    await writeFile(path.join(catalogPath, "SKILL.md"), "unmanaged new-path content\n");
    const newPathConflict = await provider.assessProvisioningUpgrade(options);
    assert.equal(newPathConflict.canProceed, false);
    assert.equal(newPathConflict.canBackupAndRestore, false);
    assert.equal(newPathConflict.items.some((item) => item.disposition === "unmanaged-conflict" && item.path === catalogPath), true);
    await rm(catalogPath, { recursive: true, force: true });
    await rm(legacyCatalogPath, { recursive: true, force: true });
    const legacyAssessment = await provider.assessProvisioningUpgrade(options);
    assert.equal(legacyAssessment.canProceed, true);
    assert.equal(legacyAssessment.items.some((item) => item.disposition === "managed-repair" && item.path === legacyCatalogPath), true);
    assert.equal(legacyAssessment.items.some((item) => item.disposition === "managed-migration" && item.path === catalogPath), true);
    assert.equal(legacyAssessment.items.some((item) => item.disposition === "managed-migration" && item.path === loaderPath), true);
    const legacyPlan = await provider.createProvisioningPlan(options);
    await provider.applyProvisioningPlan({ ...options, expectedPlanDigest: legacyPlan.planDigest, cleanupPaths: [legacyCatalogPath], confirm: true });
    assert.equal((await provider.assessProvisioningUpgrade(options)).canProceed, true);
    await access(path.join(stateRoot, "catalog", "index.json"));
    const appliedCatalog = JSON.parse(await readFile(path.join(stateRoot, "catalog", "index.json"), "utf8"));
    assert.equal(appliedCatalog.version, 2);
    assert.equal(appliedCatalog.entries[0].version, "1.2.0");
    assert.equal(appliedCatalog.entries[0].sourceClaims[0].sourceCommit, "0123456789abcdef0123456789abcdef01234567");
    await assert.rejects(access(path.join(decoyStateRoot, "projects")));

    const sharedPath = path.join(homeDir, ".codex", "skills", "_declared_shared");
    const removal = await provider.removeManagedProvisioning({ consumerRoot, stateRoot, sourceRoot, managedPaths: [catalogPath, sharedPath] });
    assert.match(removal.confirmationDigest, /^[a-f0-9]{64}$/);
    const result = await provider.removeManagedProvisioning({
      consumerRoot,
      stateRoot,
      sourceRoot,
      managedPaths: [catalogPath, sharedPath],
      confirmationDigest: removal.confirmationDigest,
      confirm: true
    });
    assert.deepEqual(result.removedPaths, [catalogPath, sharedPath].sort());
    await assert.rejects(access(catalogPath));
    await assert.rejects(access(sharedPath));
    const catalog = JSON.parse(await readFile(path.join(stateRoot, "catalog", "index.json"), "utf8"));
    assert.deepEqual(catalog.entries, []);
  } finally {
    if (previousArcForgeHome === undefined) delete process.env.ARCFORGE_HOME;
    else process.env.ARCFORGE_HOME = previousArcForgeHome;
    await rm(fixture, { recursive: true, force: true });
  }
});
