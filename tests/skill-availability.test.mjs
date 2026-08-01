import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const execFileAsync = promisify(execFile);

async function importTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(output.outputText).toString("base64")}`;
  return import(moduleUrl);
}

async function compileProjectTypeScript() {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "arcforge-compiled-core-"));
  const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
  const relativeFiles = [
    "shared/types.ts",
    "core/fs.ts",
    "core/profiles.ts",
    "core/skill-project-manifest.ts",
    "core/skill-project-availability.ts",
    "core/publish.ts",
    "core/share-sync.ts",
    "core/skill-catalog.ts",
    "core/skill-availability.ts",
    "core/skill-availability-drift.ts",
    "core/skill-availability-apply.ts"
  ];
  for (const relativeFile of relativeFiles) {
    const source = await readFile(path.join(sourceRoot, relativeFile), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      }
    });
    const outputPath = path.join(outputRoot, relativeFile.replace(/\.ts$/, ".js"));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output.outputText, "utf8");
  }
  return {
    importModule: (relativePath) => import(pathToFileURL(path.join(outputRoot, relativePath.replace(/\.ts$/, ".js"))).href),
    cleanup: () => rm(outputRoot, { recursive: true, force: true })
  };
}

test("skill project manifest accepts only the three legal availability modes", async () => {
  const { parseSkillProjectManifest, prepareSkillProjectManifestForShare } = await importTypeScript("../src/core/skill-project-manifest.ts");
  const valid = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    sourceDir: "skills",
    availability: {
      defaultMode: "user-ambient",
      skills: [
        {
          path: "skills/project-tool",
          mode: "project-ambient",
          projectApplicability: {
            summary: "Projects where this skill's workflow is relevant.",
            conditions: [
              { id: "has-relevant-workflow", kind: "required", description: "The project has the workflow governed by this skill." },
              { id: "already-automated", kind: "excluded", description: "The project already has an equivalent governed workflow." }
            ],
            evidenceGuidance: ["Inspect the project's own documentation and operating artifacts."],
            clarifyingQuestions: ["Does this project use the workflow this skill governs?"]
          }
        },
        { path: "skills/rare-tool", mode: "user-on-demand", aliases: ["rare"] }
      ]
    }
  }));

  assert.equal(valid.diagnostics.length, 0);
  assert.equal(valid.manifest.availability.skills[0].projectApplicability.conditions[0].kind, "required");
  assert.equal(valid.manifest.availability.skills[1].mode, "user-on-demand");
  const shared = prepareSkillProjectManifestForShare(valid.manifest, [{ relativePath: "skills/project-tool" }]);
  assert.equal(shared.manifest.availability.skills[0].projectApplicability.summary, "Projects where this skill's workflow is relevant.");
  assert.deepEqual(shared.manifest.availability.skills[0].projectApplicability.conditions.map((item) => item.id), [
    "already-automated",
    "has-relevant-workflow"
  ]);

  const invalid = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    sourceDir: "../skills",
    availability: {
      skills: [
        { path: "skills/rare-tool", mode: "project-on-demand" },
        { path: "skills/rare-tool", mode: "user-on-demand" }
      ]
    }
  }));

  assert.ok(invalid.diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_PATH_INVALID"));
  assert.ok(invalid.diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_MODE_INVALID"));

  const invalidAliases = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    availability: {
      skills: [{ path: "skills/global-tool", mode: "user-ambient", aliases: ["global"] }]
    }
  }));
  assert.ok(invalidAliases.diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_ALIASES_MODE_INVALID"));

  const duplicateAliases = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    unexpected: true,
    availability: {
      skills: [{ path: "skills/rare-tool", mode: "user-on-demand", aliases: ["Rare", "rare"] }]
    }
  }));
  assert.ok(duplicateAliases.diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_ALIASES_INVALID"));
  assert.ok(duplicateAliases.diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_UNKNOWN_FIELD"));

  const invalidApplicability = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    availability: {
      skills: [{
        path: "skills/global-tool",
        mode: "user-ambient",
        projectApplicability: {
          summary: "Invalid placement",
          conditions: [
            { id: "Duplicate", kind: "sometimes", description: "Invalid condition." },
            { id: "duplicate", kind: "required", description: "Duplicate condition." }
          ]
        }
      }]
    }
  }));
  assert.ok(invalidApplicability.diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_APPLICABILITY_MODE_INVALID"));
  assert.ok(invalidApplicability.diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_APPLICABILITY_CONDITION_INVALID"));
});

test("manifest matching reports stale and unclassified skill paths", async () => {
  const { parseSkillProjectManifest, validateSkillProjectManifestSkills } = await importTypeScript("../src/core/skill-project-manifest.ts");
  const parsed = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    availability: {
      skills: [
        { path: "skills/stale", mode: "user-ambient" },
        { path: "skills/configured", mode: "user-on-demand", aliases: ["shared"] },
        { path: "skills/other", mode: "user-on-demand", aliases: ["SHARED"] }
      ]
    }
  }));
  const diagnostics = validateSkillProjectManifestSkills(parsed.manifest, [
    { name: "configured", relativePath: "skills/configured" },
    { name: "other", relativePath: "skills/other" },
    { name: "new-skill", relativePath: "skills/new-skill" }
  ], parsed.diagnostics);

  assert.ok(diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_STALE_PATH" && item.path === "skills/stale"));
  assert.ok(diagnostics.some((item) => item.code === "UNCLASSIFIED_SKILL" && item.path === "skills/new-skill"));
  assert.ok(diagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_ALIAS_CONFLICT" && item.path === "SHARED"));

  const defaultOnDemand = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    availability: {
      defaultMode: "user-on-demand",
      skills: [{ path: "skills/configured", mode: "user-on-demand", aliases: ["new-skill"] }]
    }
  }));
  const defaultDiagnostics = validateSkillProjectManifestSkills(defaultOnDemand.manifest, [
    { name: "configured", relativePath: "skills/configured" },
    { name: "new-skill", relativePath: "skills/new-skill" }
  ], defaultOnDemand.diagnostics);
  assert.ok(defaultDiagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_ALIAS_CONFLICT" && item.path === "new-skill"));

  const selfAlias = parseSkillProjectManifest(JSON.stringify({
    version: 1,
    availability: {
      skills: [{ path: "skills/configured", mode: "user-on-demand", aliases: ["CONFIGURED"] }]
    }
  }));
  const selfAliasDiagnostics = validateSkillProjectManifestSkills(selfAlias.manifest, [
    { name: "configured", relativePath: "skills/configured" }
  ], selfAlias.diagnostics);
  assert.ok(selfAliasDiagnostics.some((item) => item.code === "SKILL_PROJECT_MANIFEST_ALIAS_CONFLICT" && item.path === "CONFIGURED"));
});

test("source availability plan and run maintain persistent skill type recommendations", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-source-availability-"));
  try {
    const {
      createSkillProjectAvailabilityPlan,
      executeSkillProjectAvailabilityPlan
    } = await compiled.importModule("core/skill-project-availability.ts");
    const skills = [
      { name: "global-tool", relativePath: "skills/global-tool" },
      { name: "project-tool", relativePath: "skills/project-tool" },
      { name: "rare-tool", relativePath: "skills/rare-tool" }
    ];
    const sourceOnlyRoot = path.join(root, "source-only");
    const sourceOnlyPlan = createSkillProjectAvailabilityPlan({
      root: sourceOnlyRoot,
      sourceDir: "custom-skills",
      skills: []
    });
    assert.deepEqual(sourceOnlyPlan.changes, [{
      kind: "source-dir",
      before: null,
      after: "custom-skills"
    }]);
    assert.equal((await executeSkillProjectAvailabilityPlan(sourceOnlyPlan, true)).written, true);
    assert.equal(JSON.parse(await readFile(path.join(sourceOnlyRoot, "arcforge.skill-project.json"), "utf8")).sourceDir, "custom-skills");

    const concurrentRoot = path.join(root, "concurrent");
    const concurrentPlan = createSkillProjectAvailabilityPlan({
      root: concurrentRoot,
      sourceDir: "skills",
      skills: [],
      defaultMode: "user-ambient"
    });
    await mkdir(concurrentRoot, { recursive: true });
    const concurrentManifestPath = path.join(concurrentRoot, "arcforge.skill-project.json");
    await writeFile(concurrentManifestPath, JSON.stringify({
      version: 1,
      sourceDir: "skills",
      availability: { defaultMode: "project-ambient", skills: [] }
    }), "utf8");
    await assert.rejects(
      executeSkillProjectAvailabilityPlan(concurrentPlan, true),
      /SOURCE_MANIFEST_CHANGED/
    );
    assert.equal(JSON.parse(await readFile(concurrentManifestPath, "utf8")).availability.defaultMode, "project-ambient");

    const plan = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      defaultMode: "user-ambient",
      set: [
        { skill: "project-tool", mode: "project-ambient" },
        { skill: "rare-tool", mode: "user-on-demand" }
      ],
      aliases: [{ skill: "rare-tool", aliases: ["rare", "rare-review"] }]
    });

    assert.equal(plan.blocked, false);
    assert.equal(plan.existed, false);
    assert.match(plan.planDigest, /^[a-f0-9]{64}$/);
    assert.deepEqual(plan.proposed, {
      version: 1,
      sourceDir: "skills",
      availability: {
        defaultMode: "user-ambient",
        skills: [
          { path: "skills/project-tool", mode: "project-ambient" },
          { path: "skills/rare-tool", mode: "user-on-demand", aliases: ["rare", "rare-review"] }
        ]
      }
    });
    await assert.rejects(access(path.join(root, "arcforge.skill-project.json")));
    await assert.rejects(executeSkillProjectAvailabilityPlan(plan, false), /requires --confirm/);

    const result = await executeSkillProjectAvailabilityPlan(plan, true);
    assert.equal(result.written, true);
    assert.deepEqual(JSON.parse(await readFile(result.manifestPath, "utf8")), plan.proposed);

    const projectApplicability = {
      summary: "Projects that use the workflow governed by this skill.",
      conditions: [
        { id: "equivalent-governance", kind: "excluded", description: "An equivalent governed capability already exists." },
        { id: "workflow-present", kind: "required", description: "The target project uses this workflow." }
      ],
      evidenceGuidance: ["Inspect the target project's own artifacts and documentation."],
      clarifyingQuestions: ["Is this workflow part of the target project?"]
    };
    const manifestWithApplicability = {
      ...result.manifest,
      availability: {
        ...result.manifest.availability,
        skills: result.manifest.availability.skills.map((item) => item.path === "skills/project-tool"
          ? { ...item, projectApplicability }
          : item)
      }
    };
    await writeFile(result.manifestPath, `${JSON.stringify(manifestWithApplicability, null, 2)}\n`, "utf8");

    const noOpPlan = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: manifestWithApplicability
    });
    assert.deepEqual(noOpPlan.changes, []);
    assert.equal((await executeSkillProjectAvailabilityPlan(noOpPlan, true)).written, false);

    const aliasClearPlan = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: manifestWithApplicability,
      aliases: [{ skill: "rare-tool", aliases: [] }]
    });
    assert.deepEqual(aliasClearPlan.proposed.availability.skills[1], {
      path: "skills/rare-tool",
      mode: "user-on-demand"
    });

    const cleanupPlan = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: manifestWithApplicability,
      defaultMode: null,
      remove: ["rare-tool"]
    });
    assert.equal(cleanupPlan.blocked, false);
    assert.equal(cleanupPlan.proposed.availability.defaultMode, undefined);
    assert.deepEqual(cleanupPlan.proposed.availability.skills, [
      {
        path: "skills/project-tool",
        mode: "project-ambient",
        projectApplicability
      }
    ]);

    const ambientPlan = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: manifestWithApplicability,
      set: [{ skill: "project-tool", mode: "user-ambient" }]
    });
    assert.deepEqual(ambientPlan.proposed.availability.skills[0], {
      path: "skills/project-tool",
      mode: "user-ambient"
    });

    assert.throws(() => createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      set: [{ skill: "missing", mode: "user-ambient" }]
    }), /was not discovered/);
    assert.throws(() => createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      set: [{ skill: "project-tool", mode: "project-ambient" }],
      aliases: [{ skill: "project-tool", aliases: ["project"] }]
    }), /only valid for user-on-demand/);
    assert.throws(() => createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: result.manifest,
      sourceDirOverrideProvided: true
    }), /--source-dir can only be used when creating/);
    assert.throws(() => createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      set: [
        { skill: "rare-tool", mode: "user-ambient" },
        { skill: "skills/rare-tool", mode: "user-on-demand" }
      ]
    }), /resolves to the same skill/);
    assert.throws(() => createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      set: [{ skill: "rare-tool", mode: "user-on-demand" }],
      remove: ["skills/rare-tool"]
    }), /cannot remove and update the same skill/);
    assert.throws(() => createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      set: [{ skill: "rare-tool", mode: "user-on-demand" }],
      aliases: [{ skill: "rare-tool", aliases: ["Rare", "rare"] }]
    }), /Duplicate or empty value in aliases/);

    const aliasModeRepair = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: {
        version: 1,
        sourceDir: "skills",
        availability: {
          skills: [{ path: "skills/global-tool", mode: "user-ambient", aliases: ["global"] }]
        }
      },
      currentDiagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_ALIASES_MODE_INVALID",
        path: "availability.skills[0].aliases",
        message: "invalid mode"
      }],
      set: [{ skill: "global-tool", mode: "user-on-demand" }]
    });
    assert.equal(aliasModeRepair.blocked, false);
    assert.deepEqual(aliasModeRepair.proposed.availability.skills[0], {
      path: "skills/global-tool",
      mode: "user-on-demand",
      aliases: ["global"]
    });

    const aliasModeClear = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: {
        version: 1,
        sourceDir: "skills",
        availability: {
          skills: [{ path: "skills/global-tool", mode: "user-ambient", aliases: ["global"] }]
        }
      },
      currentDiagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_ALIASES_MODE_INVALID",
        path: "availability.skills[0].aliases",
        message: "invalid mode"
      }],
      aliases: [{ skill: "global-tool", aliases: [] }]
    });
    assert.equal(aliasModeClear.blocked, false);
    assert.deepEqual(aliasModeClear.proposed.availability.skills[0], {
      path: "skills/global-tool",
      mode: "user-ambient"
    });

    const aliasConflictRepair = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: {
        version: 1,
        sourceDir: "skills",
        availability: {
          skills: [
            { path: "skills/global-tool", mode: "user-on-demand", aliases: ["shared"] },
            { path: "skills/rare-tool", mode: "user-on-demand", aliases: ["SHARED"] }
          ]
        }
      },
      currentDiagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_ALIAS_CONFLICT",
        path: "SHARED",
        message: "conflict"
      }],
      aliases: [{ skill: "rare-tool", aliases: ["rare-review"] }]
    });
    assert.equal(aliasConflictRepair.blocked, false);

    const staleRepair = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: {
        version: 1,
        sourceDir: "skills",
        availability: {
          defaultMode: "user-ambient",
          skills: [{ path: "skills/stale", mode: "user-on-demand" }]
        }
      },
      currentDiagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_STALE_PATH",
        path: "skills/stale",
        message: "stale"
      }],
      remove: ["skills/stale"]
    });
    assert.equal(staleRepair.blocked, false);
    assert.deepEqual(staleRepair.proposed.availability.skills, []);

    const blockedPlan = createSkillProjectAvailabilityPlan({
      root,
      sourceDir: "skills",
      skills,
      currentManifest: result.manifest,
      currentDiagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_SCHEMA_INVALID",
        message: "invalid"
      }]
    });
    assert.equal(blockedPlan.blocked, true);
    await assert.rejects(executeSkillProjectAvailabilityPlan(blockedPlan, true), /SOURCE_MANIFEST_INVALID/);
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("project availability CLI enforces plan, confirmation, and existing sourceDir boundaries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-source-availability-cli-"));
  const compiledRoot = path.join(root, "compiled");
  const sourceRoot = path.join(root, "source");
  const homeRoot = path.join(root, "home");
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  try {
    for (const skill of ["global-tool", "rare-tool"]) {
      const skillRoot = path.join(sourceRoot, "skills", skill);
      await mkdir(skillRoot, { recursive: true });
      await writeFile(path.join(skillRoot, "SKILL.md"), `---\nname: ${skill}\ndescription: Validation skill for ${skill}.\n---\n\n# ${skill}\n`, "utf8");
    }
    const legacyConfigPath = path.join(sourceRoot, "arcforge.config.json");
    const legacyConfig = `${JSON.stringify({ version: 1, sourceDir: "skills", profiles: [] }, null, 2)}\n`;
    await writeFile(legacyConfigPath, legacyConfig, "utf8");
    await execFileAsync(process.execPath, [
      path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"),
      "-p",
      path.join(repoRoot, "tsconfig.cli.json"),
      "--outDir",
      compiledRoot
    ], { cwd: repoRoot });
    const cliPath = path.join(compiledRoot, "cli", "index.js");
    const runCli = (args) => execFileAsync(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ARCFORGE_HOME: homeRoot }
    });
    const availabilityArgs = [
      "--root", sourceRoot,
      "--default-mode", "user-ambient",
      "--set", "rare-tool=user-on-demand",
      "--aliases", "rare-tool=rare|special-review"
    ];

    const planned = JSON.parse((await runCli(["project", "availability", "plan", ...availabilityArgs])).stdout);
    assert.equal(planned.blocked, false);
    assert.match(planned.planDigest, /^[a-f0-9]{64}$/);
    await assert.rejects(access(path.join(sourceRoot, "arcforge.skill-project.json")));
    assert.equal(await readFile(legacyConfigPath, "utf8"), legacyConfig);
    await assert.rejects(access(homeRoot));
    await assert.rejects(
      runCli(["project", "availability", "run", ...availabilityArgs]),
      (error) => error.code === 1 && /requires --confirm/.test(error.stdout)
    );
    await assert.rejects(
      runCli(["project", "availability", "run", ...availabilityArgs, "--confirm"]),
      (error) => error.code === 1 && /requires --plan-digest/.test(error.stdout)
    );
    await assert.rejects(
      runCli(["project", "availability", "run", ...availabilityArgs, "--plan-digest", "0".repeat(64), "--confirm"]),
      (error) => error.code === 1 && /plan changed/.test(error.stdout)
    );
    await assert.rejects(access(path.join(sourceRoot, "arcforge.skill-project.json")));

    const applied = JSON.parse((await runCli([
      "project", "availability", "run", ...availabilityArgs,
      "--plan-digest", planned.planDigest,
      "--confirm"
    ])).stdout);
    assert.equal(applied.written, true);
    assert.equal(JSON.parse(await readFile(applied.manifestPath, "utf8")).availability.skills[0].mode, "user-on-demand");
    await assert.rejects(
      runCli(["project", "availability", "plan", "--root", sourceRoot, "--source-dir", "other"]),
      (error) => error.code === 1 && /--source-dir can only be used when creating/.test(error.stderr)
    );

    const unsafeSourceRoot = path.join(root, "unsafe-source");
    await mkdir(unsafeSourceRoot, { recursive: true });
    await writeFile(path.join(unsafeSourceRoot, "arcforge.config.json"), JSON.stringify({
      version: 1,
      sourceDir: "../outside",
      profiles: []
    }), "utf8");
    await assert.rejects(
      runCli(["project", "availability", "plan", "--root", unsafeSourceRoot]),
      (error) => error.code === 1 && /normalized relative path inside the workspace root/.test(error.stderr)
    );

    if (process.platform !== "win32") {
      const outsideRoot = path.join(root, "outside-source");
      const linkedSourceRoot = path.join(root, "linked-source");
      await mkdir(path.join(outsideRoot, "rare-tool"), { recursive: true });
      await mkdir(linkedSourceRoot, { recursive: true });
      await writeFile(path.join(outsideRoot, "rare-tool", "SKILL.md"), "---\nname: rare-tool\ndescription: Outside.\n---\n", "utf8");
      await symlink(outsideRoot, path.join(linkedSourceRoot, "skills"), "dir");
      await assert.rejects(
        runCli(["project", "availability", "plan", "--root", linkedSourceRoot, "--source-dir", "skills"]),
        (error) => error.code === 1 && /resolves outside the maintenance source root/.test(error.stderr)
      );

      const brokenLinkedSourceRoot = path.join(root, "broken-linked-source");
      await mkdir(brokenLinkedSourceRoot, { recursive: true });
      await symlink(path.join(root, "missing-outside-source"), path.join(brokenLinkedSourceRoot, "skills"), "dir");
      await assert.rejects(
        runCli(["project", "availability", "plan", "--root", brokenLinkedSourceRoot, "--source-dir", "skills"]),
        (error) => error.code === 1 && /resolves outside the maintenance source root/.test(error.stderr)
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sharing publishes a normalized source manifest for only the selected skills", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-manifest-share-"));
  try {
    const { createPublishPlan } = await compiled.importModule("core/publish.ts");
    const { syncProjectToShareTarget } = await compiled.importModule("core/share-sync.ts");
    const sourceRoot = path.join(root, "source");
    const targetRoot = path.join(root, "target");
    const ambientPath = path.join(sourceRoot, "skills", "ambient");
    const rarePath = path.join(sourceRoot, "skills", "rare");
    await mkdir(ambientPath, { recursive: true });
    await mkdir(rarePath, { recursive: true });
    await writeFile(path.join(ambientPath, "SKILL.md"), "ambient", "utf8");
    await writeFile(path.join(rarePath, "SKILL.md"), "rare", "utf8");

    const config = {
      version: 1,
      sourceDir: "skills",
      profiles: [{ name: "default", skills: ["rare"], targets: ["codex"] }]
    };
    const selectedSkills = [{
      name: "rare",
      description: "rare",
      path: rarePath,
      relativePath: "skills/rare",
      targets: [],
      hasReferences: false,
      hasScripts: false
    }];
    const manifest = {
      version: 1,
      sourceDir: "skills",
      availability: {
        defaultMode: "project-ambient",
        skills: [
          { path: "skills/rare", mode: "user-on-demand", aliases: ["zeta", "rare"] },
          { path: "skills/ambient", mode: "user-ambient" }
        ]
      }
    };
    const diagnostics = [{ severity: "warning", code: "TEST_WARNING", message: "kept in plan" }];

    const plan = await createPublishPlan(sourceRoot, config, selectedSkills, "private", manifest, diagnostics);
    assert.deepEqual(plan.files, [path.join("skills", "rare", "SKILL.md")]);
    assert.deepEqual(plan.sourceManifest.selectedSkillPaths, ["skills/rare"]);
    assert.match(plan.sourceManifest.policyDigest, /^[a-f0-9]{64}$/);
    assert.match(plan.sourceManifest.diagnostics[0], /TEST_WARNING/);
    assert.equal(plan.assessmentStatus, "not-supplied");

    await syncProjectToShareTarget(sourceRoot, targetRoot, config, selectedSkills, [], "private", "Source", "source", manifest, diagnostics);
    const sharedManifest = JSON.parse(await readFile(path.join(targetRoot, "arcforge.skill-project.json"), "utf8"));
    assert.equal(sharedManifest.availability.defaultMode, "project-ambient");
    assert.deepEqual(sharedManifest.availability.skills, [{
      path: "skills/rare",
      mode: "user-on-demand",
      aliases: ["rare", "zeta"]
    }]);
    assert.equal(await readFile(path.join(targetRoot, "skills", "rare", "SKILL.md"), "utf8"), "rare");
    await assert.rejects(access(path.join(targetRoot, "skills", "ambient")));
    await assert.rejects(access(path.join(targetRoot, "arcforge.config.json")));
    const factualReadme = await readFile(path.join(targetRoot, "README.md"), "utf8");
    assert.doesNotMatch(factualReadme, /skillshare install|npx skills add|generic checklist/i);

    const assessedTargetRoot = path.join(root, "assessed-target");
    const readinessAssessment = {
      summary: "Agent judged this source ready for the selected consumer.",
      evidence: ["The consumer contract was reviewed."],
      unknowns: ["Registry publication remains external."],
      installCommandCandidates: ["consumer-specific install command"],
      checklist: ["Confirm the external release target."]
    };
    const assessedPlan = await createPublishPlan(sourceRoot, config, selectedSkills, "private", manifest, diagnostics, readinessAssessment);
    assert.equal(assessedPlan.assessmentStatus, "supplied");
    assert.deepEqual(assessedPlan.readinessAssessment, readinessAssessment);
    await syncProjectToShareTarget(sourceRoot, assessedTargetRoot, config, selectedSkills, [], "private", "Source", "source-assessed", manifest, diagnostics, readinessAssessment);
    const assessedReadme = await readFile(path.join(assessedTargetRoot, "README.md"), "utf8");
    assert.match(assessedReadme, /Agent-supplied readiness assessment/);
    assert.match(assessedReadme, /consumer-specific install command/);

    await execFileAsync("git", ["init", targetRoot]);
    await execFileAsync("git", ["-C", targetRoot, "add", "--", "skills", "README.md", "arcforge.skill-project.json"]);
    const { stdout: staged } = await execFileAsync("git", ["-C", targetRoot, "diff", "--cached", "--name-only"]);
    assert.deepEqual(staged.trim().split("\n").sort(), ["README.md", "arcforge.skill-project.json", "skills/rare/SKILL.md"]);
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("sharing rejects invalid source manifest diagnostics before creating the target", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-invalid-manifest-share-"));
  try {
    const { syncProjectToShareTarget } = await compiled.importModule("core/share-sync.ts");
    const sourceRoot = path.join(root, "source");
    const targetRoot = path.join(root, "target");
    await mkdir(path.join(sourceRoot, "skills", "rare"), { recursive: true });
    await assert.rejects(syncProjectToShareTarget(
      sourceRoot,
      targetRoot,
      { version: 1, sourceDir: "skills", profiles: [] },
      [],
      [],
      "private",
      "Source",
      "source",
      { version: 1, availability: { skills: [] } },
      [{ severity: "error", code: "SKILL_PROJECT_MANIFEST_STALE_PATH", path: "skills/stale", message: "stale" }]
    ), /SOURCE_MANIFEST_INVALID/);
    await assert.rejects(access(targetRoot));
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("availability resolution follows invocation, profile, and source precedence and leaves gaps unclassified", async () => {
  const { resolveSkillAvailability } = await importTypeScript("../src/core/skill-availability.ts");
  const result = resolveSkillAvailability({
    skills: [
      { name: "invoked", relativePath: "skills/invoked" },
      { name: "profiled", relativePath: "skills/profiled" },
      { name: "sourced", relativePath: "skills/sourced" },
      { name: "fallback", relativePath: "skills/fallback" }
    ],
    invocationOverrides: [{ skill: "invoked", mode: "user-on-demand" }],
    profile: {
      availability: {
        skills: [{ skill: "profiled", mode: "project-ambient" }]
      }
    },
    sourceManifest: {
      version: 1,
      availability: {
        skills: [{ path: "skills/sourced", mode: "user-ambient" }]
      }
    },
    projectAssessments: [{
      skill: "profiled",
      projectRoots: ["/example/project"],
      status: "suitable",
      decidedBy: "agent",
      summary: "Assessment supplied by the caller.",
      conditionResults: [],
      evidence: ["Caller evidence"],
      unknowns: []
    }]
  });

  assert.deepEqual(result.items.map((item) => [item.skill, item.effectiveMode, item.policyOrigin]), [
    ["invoked", "user-on-demand", "invocation"],
    ["profiled", "project-ambient", "profile-skill"],
    ["sourced", "user-ambient", "source-skill"],
    ["fallback", undefined, "unclassified"]
  ]);
  assert.deepEqual(result.diagnostics.filter((item) => item.severity === "error").map((item) => item.code), ["UNCLASSIFIED_SKILL"]);
});

test("project assessments require evidence and resolve relative roots from the consumer project", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-assessment-roots-"));
  try {
    const skillPath = path.join(root, "skills", "project-tool");
    await mkdir(skillPath, { recursive: true });
    await writeFile(path.join(skillPath, "SKILL.md"), "---\nname: project-tool\ndescription: test\n---\n", "utf8");
    const { createSkillAvailabilityPlan, resolveSkillAvailability } = await compiled.importModule("core/skill-availability.ts");
    const manifest = {
      version: 1,
      availability: {
        skills: [{
          path: "skills/project-tool",
          mode: "project-ambient",
          projectApplicability: {
            summary: "Caller-evaluated guidance.",
            conditions: [{ id: "relevant", kind: "required", description: "The workflow is relevant." }]
          }
        }]
      }
    };
    const missingConditionEvidence = resolveSkillAvailability({
      skills: [{ name: "project-tool", relativePath: "skills/project-tool" }],
      sourceManifest: manifest,
      projectAssessments: [{
        skill: "project-tool",
        projectRoots: ["app"],
        status: "suitable",
        decidedBy: "agent",
        summary: "No evidence was supplied.",
        conditionResults: [{ conditionId: "relevant", outcome: "met", evidence: [] }],
        evidence: ["Overall evidence"],
        unknowns: []
      }]
    });
    assert.ok(missingConditionEvidence.diagnostics.some((item) => item.code === "PROJECT_ASSESSMENT_RESULT_INVALID"));

    const missingOverallEvidence = resolveSkillAvailability({
      skills: [{ name: "project-tool", relativePath: "skills/project-tool" }],
      sourceManifest: manifest,
      projectAssessments: [{
        skill: "project-tool",
        projectRoots: ["app"],
        status: "suitable",
        decidedBy: "agent",
        summary: "No overall evidence was supplied.",
        conditionResults: [{ conditionId: "relevant", outcome: "met", evidence: ["Condition evidence"] }],
        evidence: [],
        unknowns: []
      }]
    });
    assert.ok(missingOverallEvidence.diagnostics.some((item) => item.code === "PROJECT_ASSESSMENT_INVALID"));

    const consumerRoot = path.join(root, "consumer");
    const plan = await createSkillAvailabilityPlan({
      source: {
        root,
        config: { version: 1, sourceDir: "skills", profiles: [{ name: "default", skills: ["*"], targets: ["codex"] }] },
        sourceManifest: manifest,
        sourceManifestDiagnostics: [],
        skills: [{ name: "project-tool", description: "test", path: skillPath, relativePath: "skills/project-tool", targets: [], hasReferences: false, hasScripts: false }],
        assets: [],
        audit: { root, generatedAt: "", skills: [], findings: [], coverage: { skillsChecked: 0, filesChecked: 0, ruleCategories: [], findingCounts: { info: 0, warning: 0, critical: 0 } }, disclaimer: "", feedbackUrl: "" }
      },
      consumerRoot,
      profileName: "default",
      agentTargetIds: ["codex"],
      projectTargetDirs: ["app"],
      projectAssessments: [{
        skill: "project-tool",
        projectRoots: ["app"],
        status: "suitable",
        decidedBy: "agent",
        summary: "Evidence supports applicability.",
        conditionResults: [{ conditionId: "relevant", outcome: "met", evidence: ["Observed workflow evidence."] }],
        evidence: ["Observed project evidence."],
        unknowns: []
      }]
    });
    assert.equal(plan.diagnostics.filter((item) => item.severity === "error").length, 0);
    assert.deepEqual(plan.items[0].projectAssessment.projectRoots, [path.join(consumerRoot, "app")]);
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("workspace scan exposes source manifest diagnostics without merging them into local config", async () => {
  const workspace = await readFile(new URL("../src/core/workspace.ts", import.meta.url), "utf8");
  const sharedTypes = await readFile(new URL("../src/shared/types.ts", import.meta.url), "utf8");

  assert.match(workspace, /loadSkillProjectManifest/);
  assert.match(workspace, /validateSkillProjectManifestSkills/);
  assert.match(workspace, /sourceManifestDiagnostics/);
  assert.match(workspace, /withManifestSourceDir/);
  assert.match(sharedTypes, /sourceManifest\?: SkillProjectManifest/);
  assert.match(sharedTypes, /availability\?: ArcForgeProfileAvailability/);
});

test("availability plan maps all three modes without writing destinations", async () => {
  const { createSkillAvailabilityPlan, ARCFORGE_ON_DEMAND_SKILL_NAME } = await importTypeScript("../src/core/skill-availability.ts");
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-availability-plan-"));
  try {
    const skillInputs = [
      ["global-tool", "user-ambient"],
      ["project-tool", "project-ambient"],
      ["rare-tool", "user-on-demand"],
      ["fallback-tool", "project-ambient"],
      ["arcforge-on-demand", "user-ambient"]
    ];
    const skills = [];
    for (const [name] of skillInputs) {
      const skillPath = path.join(root, "skills", name);
      await mkdir(skillPath, { recursive: true });
      await writeFile(path.join(skillPath, "SKILL.md"), `---\nname: ${name}\ndescription: test\n---\n`, "utf8");
      skills.push({
        name,
        description: "test",
        path: skillPath,
        relativePath: `skills/${name}`,
        targets: [],
        hasReferences: false,
        hasScripts: false
      });
    }
    const homeDir = path.join(root, "planned-home");
    const consumerRoot = path.join(root, "consumer");
    const loaderSourcePath = path.join(root, "bundled-loader");
    await mkdir(loaderSourcePath, { recursive: true });
    await writeFile(path.join(loaderSourcePath, "SKILL.md"), "loader", "utf8");
    const sourceManifest = {
      version: 1,
      sourceDir: "skills",
      availability: {
        skills: [
          { path: "skills/global-tool", mode: "user-ambient" },
          {
            path: "skills/project-tool",
            mode: "project-ambient",
            projectApplicability: {
              summary: "Projects where the skill's workflow is relevant.",
              conditions: [
                { id: "workflow-present", kind: "required", description: "The target project uses this workflow." }
              ],
              evidenceGuidance: ["Inspect the target project's own context."]
            }
          },
          { path: "skills/rare-tool", mode: "user-on-demand", aliases: ["rare"] },
          { path: "skills/fallback-tool", mode: "project-ambient" }
        ]
      }
    };
    const source = {
      root,
      config: {
        version: 1,
        sourceDir: "skills",
        profiles: [{
          name: "default",
          skills: ["*"],
          targets: ["codex", "claude"]
        }]
      },
      sourceManifest,
      sourceManifestDiagnostics: [],
      skills,
      assets: [],
      audit: { root, generatedAt: "", skills: [], findings: [], coverage: { skillsChecked: 0, filesChecked: 0, ruleCategories: [], findingCounts: { info: 0, warning: 0, critical: 0 } }, disclaimer: "", feedbackUrl: "" },
      localGit: {
        root,
        relativePath: ".",
        remotes: [{ name: "origin", canonicalKey: "github.com/acme/skills" }]
      }
    };
    const oldDestination = path.join(root, "old", "project-tool");
    const plan = await createSkillAvailabilityPlan({
      source,
      consumerRoot,
      profileName: "default",
      agentTargetIds: ["codex", "claude", "codex"],
      projectTargetDirs: ["app-a", "app-b"],
      projectAssessments: [
        {
          skill: "project-tool",
          projectRoots: [path.join(consumerRoot, "app-a"), path.join(consumerRoot, "app-b")],
          status: "suitable",
          decidedBy: "agent",
          summary: "The workflow is present.",
          conditionResults: [{ conditionId: "workflow-present", outcome: "met", evidence: ["Observed workflow material."] }],
          evidence: ["Project evidence"],
          unknowns: []
        },
        {
          skill: "fallback-tool",
          projectRoots: [path.join(consumerRoot, "app-a"), path.join(consumerRoot, "app-b")],
          status: "suitable",
          decidedBy: "agent",
          summary: "Caller assessed the selected project roots.",
          conditionResults: [],
          evidence: ["Project evidence"],
          unknowns: []
        }
      ],
      homeDir,
      loaderSourcePath,
      appliedRecords: [{
        id: "old",
        sourceRoot: root,
        profile: "default",
        targetDir: "legacy",
        skills: ["project-tool"],
        updatedAt: "2026-07-30T00:00:00.000Z",
        availabilityItems: [{
          skill: "project-tool",
          mode: "user-ambient",
          policyOrigin: "compatibility",
          destinations: [oldDestination]
        }]
      }]
    });

    assert.equal(plan.sourceIdentity, "git:github.com/acme/skills#.");
    assert.match(plan.sourceKey, /^[a-f0-9]{24}$/);
    assert.match(plan.sourcePolicyDigest, /^[a-f0-9]{64}$/);
    assert.equal(plan.requiresConfirm, true);
    assert.equal(plan.diagnostics.length, 0);
    assert.deepEqual(plan.items.map((item) => [item.skill, item.effectiveMode, item.destinations.length]), [
      ["global-tool", "user-ambient", 2],
      ["project-tool", "project-ambient", 4],
      ["rare-tool", "user-on-demand", 1],
      ["fallback-tool", "project-ambient", 4]
    ]);
    assert.equal(plan.items.find((item) => item.skill === "fallback-tool").policyOrigin, "source-skill");
    assert.equal(plan.items.find((item) => item.skill === "project-tool").projectApplicability.conditions[0].id, "workflow-present");
    assert.equal(plan.items.some((item) => item.skill === ARCFORGE_ON_DEMAND_SKILL_NAME), false);
    assert.deepEqual(plan.loaderTargets.map((item) => item.agentId), ["claude", "codex"]);
    assert.ok(plan.loaderTargets.every((item) => item.path.endsWith(ARCFORGE_ON_DEMAND_SKILL_NAME)));
    assert.ok(plan.loaderTargets.every((item) => item.status === "missing"));
    assert.equal(plan.cleanup.length, 1);
    assert.equal(plan.cleanup[0].path, oldDestination);
    await assert.rejects(access(homeDir));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("availability plan reports missing or unknown target context as blocking diagnostics", async () => {
  const { createSkillAvailabilityPlan } = await importTypeScript("../src/core/skill-availability.ts");
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-availability-diagnostics-"));
  try {
    const skillPath = path.join(root, "skills", "project-tool");
    await mkdir(skillPath, { recursive: true });
    await writeFile(path.join(skillPath, "SKILL.md"), "project", "utf8");
    const source = {
      root,
      config: {
        version: 1,
        sourceDir: "skills",
        profiles: [{
          name: "default",
          skills: ["*"],
          targets: [],
          availability: { defaultMode: "project-ambient" }
        }]
      },
      skills: [{
        name: "project-tool",
        description: "test",
        path: skillPath,
        relativePath: "skills/project-tool",
        targets: [],
        hasReferences: false,
        hasScripts: false
      }],
      assets: [],
      audit: { root, generatedAt: "", skills: [], findings: [], coverage: { skillsChecked: 0, filesChecked: 0, ruleCategories: [], findingCounts: { info: 0, warning: 0, critical: 0 } }, disclaimer: "", feedbackUrl: "" }
    };
    const plan = await createSkillAvailabilityPlan({
      source,
      profileName: "default",
      agentTargetIds: ["unknown-agent"],
      projectTargetDirs: []
    });
    const codes = new Set(plan.diagnostics.filter((item) => item.severity === "error").map((item) => item.code));

    assert.ok(codes.has("AGENT_TARGET_UNKNOWN"));
    assert.ok(codes.has("PROJECT_AGENT_TARGET_REQUIRED"));
    assert.ok(codes.has("PROJECT_TARGET_REQUIRED"));
    assert.equal(plan.items[0].destinations.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("on-demand loader planning distinguishes same, managed update, conflict, and post-plan replacement", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-loader-ownership-"));
  try {
    const { createSkillAvailabilityPlan } = await compiled.importModule("core/skill-availability.ts");
    const { executeSkillAvailabilityPlan } = await compiled.importModule("core/skill-availability-apply.ts");
    const skillPath = path.join(root, "source", "skills", "rare");
    const loaderSourcePath = path.join(root, "bundled-loader");
    const homeDir = path.join(root, "home");
    const loaderTarget = path.join(homeDir, ".codex", "skills", "arcforge-on-demand");
    await mkdir(skillPath, { recursive: true });
    await mkdir(loaderSourcePath, { recursive: true });
    await mkdir(loaderTarget, { recursive: true });
    await writeFile(path.join(skillPath, "SKILL.md"), "rare", "utf8");
    await writeFile(path.join(loaderSourcePath, "SKILL.md"), "arcforge loader", "utf8");
    await writeFile(path.join(loaderTarget, "SKILL.md"), "foreign loader", "utf8");
    const source = {
      root: path.join(root, "source"),
      config: {
        version: 1,
        sourceDir: "skills",
        profiles: [{ name: "default", skills: ["*"], targets: ["codex"] }]
      },
      sourceManifest: {
        version: 1,
        sourceDir: "skills",
        availability: { skills: [{ path: "skills/rare", mode: "user-on-demand" }] }
      },
      sourceManifestDiagnostics: [],
      skills: [{
        name: "rare",
        description: "rare",
        path: skillPath,
        relativePath: "skills/rare",
        targets: [],
        hasReferences: false,
        hasScripts: false
      }],
      assets: [],
      audit: { root, generatedAt: "", skills: [], findings: [], coverage: { skillsChecked: 0, filesChecked: 0, ruleCategories: [], findingCounts: { info: 0, warning: 0, critical: 0 } }, disclaimer: "", feedbackUrl: "" }
    };
    const planOptions = {
      source,
      consumerRoot: root,
      profileName: "default",
      agentTargetIds: ["codex"],
      homeDir,
      loaderSourcePath
    };

    const conflictPlan = await createSkillAvailabilityPlan(planOptions);
    assert.equal(conflictPlan.loaderTargets[0].status, "conflict");
    assert.ok(conflictPlan.diagnostics.some((item) => item.code === "ON_DEMAND_LOADER_CONFLICT" && item.severity === "error"));
    await assert.rejects(executeSkillAvailabilityPlan({
      source,
      plan: conflictPlan,
      catalogRoot: path.join(homeDir, ".arcforge", "catalog"),
      loaderSourcePath
    }), (error) => error?.code === "APPLY_PLAN_INVALID");
    assert.equal(await readFile(path.join(loaderTarget, "SKILL.md"), "utf8"), "foreign loader");

    await writeFile(path.join(loaderTarget, "SKILL.md"), "arcforge loader", "utf8");
    const samePlan = await createSkillAvailabilityPlan(planOptions);
    assert.equal(samePlan.loaderTargets[0].status, "same");
    assert.equal(samePlan.diagnostics.some((item) => item.code === "ON_DEMAND_LOADER_CONFLICT"), false);

    await writeFile(path.join(loaderTarget, "SKILL.md"), "older arcforge loader", "utf8");
    const managedPlan = await createSkillAvailabilityPlan({
      ...planOptions,
      appliedRecords: [{
        id: "saved-availability",
        sourceRoot: source.root,
        profile: "default",
        targetDir: "",
        skills: ["rare"],
        availabilityItems: [{
          skill: "rare",
          mode: "user-on-demand",
          policyOrigin: "source-skill",
          destinations: [path.join(homeDir, ".arcforge", "catalog", "old", "rare")]
        }],
        availabilityContext: {
          agentTargetIds: ["codex"],
          projectTargetDirs: [],
          homeDir
        },
        updatedAt: "2026-07-31T00:00:00.000Z"
      }]
    });
    assert.equal(managedPlan.loaderTargets[0].status, "managed-update");
    assert.equal(managedPlan.diagnostics.some((item) => item.code === "ON_DEMAND_LOADER_CONFLICT"), false);

    await rm(loaderTarget, { recursive: true, force: true });
    const missingPlan = await createSkillAvailabilityPlan(planOptions);
    assert.equal(missingPlan.loaderTargets[0].status, "missing");
    await mkdir(loaderTarget, { recursive: true });
    await writeFile(path.join(loaderTarget, "SKILL.md"), "created after planning", "utf8");
    await assert.rejects(executeSkillAvailabilityPlan({
      source,
      plan: missingPlan,
      catalogRoot: path.join(homeDir, ".arcforge", "catalog"),
      loaderSourcePath
    }), (error) => error?.code === "APPLY_PLAN_INVALID" && /changed after planning/.test(error.message));
    assert.equal(await readFile(path.join(loaderTarget, "SKILL.md"), "utf8"), "created after planning");
    await assert.rejects(access(missingPlan.items[0].destinations[0].path));
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("availability planning is exposed through source, CLI, and Electron read-only entry points", async () => {
  const sources = await readFile(new URL("../src/core/sources.ts", import.meta.url), "utf8");
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const preload = await readFile(new URL("../src/electron/preload.cts", import.meta.url), "utf8");
  const uiTypes = await readFile(new URL("../src/ui/types.ts", import.meta.url), "utf8");

  assert.match(sources, /createAvailabilityPlanFromSource/);
  assert.match(sources, /createSkillAvailabilityPlan/);
  assert.match(sources, /const records = await listAppliedSources/);
  assert.match(sources, /reusableProjectAssessments\(records, sourceRoot, consumerRoot/);
  assert.match(sources, /record\.sourcePolicyDigest === currentPolicyDigest/);
  assert.match(sources, /projectAssessments: plan\.items\.flatMap/);
  assert.match(commands, /arcforge apply plan/);
  assert.match(commands, /--agent-targets/);
  assert.match(commands, /--project-targets/);
  assert.match(commands, /--availability/);
  assert.match(commands, /--project-assessments/);
  assert.match(electronMain, /ipcMain\.handle\("apply:plan"/);
  assert.match(preload, /ipcRenderer\.invoke\("apply:plan"/);
  assert.match(uiTypes, /createSkillAvailabilityPlan/);
});

test("desktop target groups review standard agent availability plans and keep custom targets direct", async () => {
  const { hasMixedApplyTargetModes, usesAvailabilityPlanning } = await importTypeScript("../src/ui/utils.ts");
  const main = await readFile(new URL("../src/ui/main.tsx", import.meta.url), "utf8");
  const destinations = await readFile(new URL("../src/ui/views/destinations.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/ui/styles.css", import.meta.url), "utf8");

  assert.equal(usesAvailabilityPlanning({ agentTargetIds: ["codex"], projectTargetDirs: [], customTargetDirs: [] }), true);
  assert.equal(usesAvailabilityPlanning({ agentTargetIds: ["codex"], projectTargetDirs: ["app"], customTargetDirs: [] }), true);
  assert.equal(usesAvailabilityPlanning({ agentTargetIds: ["codex"], projectTargetDirs: [], customTargetDirs: ["custom"] }), false);
  assert.equal(usesAvailabilityPlanning({ agentTargetIds: [], projectTargetDirs: [], customTargetDirs: ["custom"] }), false);
  assert.equal(hasMixedApplyTargetModes({ agentTargetIds: ["codex"], projectTargetDirs: [], customTargetDirs: ["custom"] }), true);

  assert.match(main, /createSkillAvailabilityPlan/);
  assert.match(main, /driftSkillAvailability/);
  assert.match(main, /applySkillAvailabilityPlan/);
  assert.match(main, /from: root/);
  assert.match(main, /cleanupPaths/);
  assert.match(main, /confirm: true/);
  assert.match(destinations, /sourceRecommendation/);
  assert.match(destinations, /effectiveMode/);
  assert.match(destinations, /policyOrigin/);
  assert.match(destinations, /item\.projectAssessment\.summary/);
  assert.match(destinations, /PROJECT_ASSESSMENT_NEEDS_INPUT/);
  assert.match(destinations, /PROJECT_ASSESSMENT_TARGET_MISMATCH/);
  assert.match(destinations, /projectRootsForItem/);
  assert.match(destinations, /loaderTargets/);
  assert.match(destinations, /loaderTargetStatus\(target\.status\)/);
  assert.match(destinations, /plan\.cleanup\.map/);
  assert.match(destinations, /saveRelationship/);
  assert.match(destinations, /blockingDiagnostics/);
  assert.match(destinations, /diagnostic\.severity === "error" \? "danger"/);
  assert.match(styles, /\.badge\.danger/);
  assert.match(styles, /\.check-row:has\(input:checked\)/);
  assert.match(styles, /--surface-scrim/);
});

test("user skill catalog saves atomically and resolves exact, alias, qualified, and search queries", async () => {
  const {
    catalogDirectoryDigest,
    catalogQualifiedName,
    loadUserSkillCatalog,
    resolveCatalogSkill,
    saveUserSkillCatalog
  } = await importTypeScript("../src/core/skill-catalog.ts");
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-skill-catalog-"));
  try {
    const sourceKey = "a".repeat(24);
    const skillPath = path.join(root, sourceKey, "review");
    await mkdir(skillPath, { recursive: true });
    await writeFile(path.join(skillPath, "SKILL.md"), "review skill", "utf8");
    const entry = {
      qualifiedName: catalogQualifiedName(sourceKey, "review"),
      sourceKey,
      skillName: "review",
      aliases: ["code-review"],
      summary: "Review a code change",
      sourceRoot: "/maintenance/review-skills",
      skillPath: "skills/review",
      installedPath: skillPath,
      contentDigest: await catalogDirectoryDigest(skillPath),
      appliedRecordIds: ["team-default"],
      installedAt: "2026-07-30T00:00:00.000Z"
    };
    const saved = await saveUserSkillCatalog([entry], {
      catalogRoot: root,
      now: new Date("2026-07-30T01:00:00.000Z")
    });

    assert.equal(saved.updatedAt, "2026-07-30T01:00:00.000Z");
    assert.deepEqual((await readdir(root)).filter((name) => name.includes(".tmp-")), []);
    assert.deepEqual(await loadUserSkillCatalog({ catalogRoot: root }), saved);
    for (const [query, mode] of [["review", "exact"], ["code-review", "exact"], [entry.qualifiedName, "exact"], ["code change", "search"]]) {
      const result = await resolveCatalogSkill(query, mode, { catalogRoot: root });
      assert.equal(result.status, "resolved");
      assert.equal(result.resolved.qualifiedName, entry.qualifiedName);
      assert.deepEqual(Object.keys(result.candidates[0]).sort(), ["qualifiedName", "skillName", "sourceKey", "summary"]);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("catalog resolver reports ambiguous names and rejects path escape or content drift", async () => {
  const {
    catalogDirectoryDigest,
    catalogQualifiedName,
    resolveCatalogSkill,
    saveUserSkillCatalog
  } = await importTypeScript("../src/core/skill-catalog.ts");
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-skill-catalog-validation-"));
  const outside = await mkdtemp(path.join(tmpdir(), "arcforge-skill-catalog-outside-"));
  try {
    const entries = [];
    for (const sourceKey of ["a".repeat(24), "b".repeat(24)]) {
      const installedPath = path.join(root, sourceKey, "review");
      await mkdir(installedPath, { recursive: true });
      await writeFile(path.join(installedPath, "SKILL.md"), sourceKey, "utf8");
      entries.push({
        qualifiedName: catalogQualifiedName(sourceKey, "review"),
        sourceKey,
        skillName: "review",
        summary: `Review from ${sourceKey[0]}`,
        sourceRoot: `/maintenance/${sourceKey[0]}`,
        skillPath: "skills/review",
        installedPath,
        contentDigest: await catalogDirectoryDigest(installedPath),
        appliedRecordIds: [],
        installedAt: "2026-07-30T00:00:00.000Z"
      });
    }
    await saveUserSkillCatalog(entries, { catalogRoot: root });

    const ambiguous = await resolveCatalogSkill("review", "exact", { catalogRoot: root });
    assert.equal(ambiguous.status, "ambiguous");
    assert.deepEqual(ambiguous.candidates.map((item) => item.sourceKey), ["a".repeat(24), "b".repeat(24)]);

    await writeFile(path.join(entries[0].installedPath, "SKILL.md"), "changed", "utf8");
    await assert.rejects(
      resolveCatalogSkill(entries[0].qualifiedName, "exact", { catalogRoot: root }),
      (error) => error.code === "CATALOG_CONTENT_DRIFT"
    );

    const outsideSkill = path.join(outside, "review");
    await mkdir(outsideSkill, { recursive: true });
    await writeFile(path.join(outsideSkill, "SKILL.md"), "outside", "utf8");
    const escaped = {
      ...entries[0],
      installedPath: outsideSkill,
      contentDigest: await catalogDirectoryDigest(outsideSkill)
    };
    await saveUserSkillCatalog([escaped], { catalogRoot: root });
    await assert.rejects(
      resolveCatalogSkill(escaped.qualifiedName, "exact", { catalogRoot: root }),
      (error) => error.code === "CATALOG_PATH_ESCAPE"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("catalog resolve CLI is wired as a read-only explicit-invocation surface", async () => {
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../src/core/skill-catalog.ts", import.meta.url), "utf8");
  const sharedTypes = await readFile(new URL("../src/shared/types.ts", import.meta.url), "utf8");

  assert.match(commands, /arcforge catalog resolve --query/);
  assert.match(commands, /resolveCatalogSkill/);
  assert.match(commands, /Catalog mode must be exact or search/);
  assert.match(catalog, /CATALOG_PATH_ESCAPE/);
  assert.match(catalog, /CATALOG_CONTENT_DRIFT/);
  assert.match(catalog, /fs\.rename\(temporaryPath, indexPath\)/);
  assert.match(sharedTypes, /interface UserSkillCatalog/);
  assert.match(sharedTypes, /interface CatalogResolveResult/);
});

test("on-demand entry skill is explicit-only, resolver-backed, and included in distributable packages", async () => {
  const skill = await readFile(new URL("../skills/arcforge-on-demand/SKILL.md", import.meta.url), "utf8");
  const agentMetadata = await readFile(new URL("../skills/arcforge-on-demand/agents/openai.yaml", import.meta.url), "utf8");
  const cliPackage = await readFile(new URL("../scripts/build-cli-package.mjs", import.meta.url), "utf8");
  const desktopPackage = await readFile(new URL("../scripts/build-package-config.mjs", import.meta.url), "utf8");
  const availability = await readFile(new URL("../src/core/skill-availability.ts", import.meta.url), "utf8");

  assert.match(skill, /^---\nname: arcforge-on-demand\n/);
  assert.match(skill, /只处理用户本轮明确提出的加载或 catalog 搜索意图/);
  assert.match(skill, /arcforge catalog resolve --query/);
  assert.match(skill, /not-found/);
  assert.match(skill, /ambiguous/);
  assert.match(skill, /resolved\.installedPath/);
  assert.match(agentMetadata, /\$arcforge-on-demand/);
  assert.match(cliPackage, /skills["'], "arcforge-on-demand/);
  assert.match(desktopPackage, /skills\/arcforge-on-demand\/\*\*\/\*/);
  assert.match(availability, /RESERVED_LOADER_SKILL/);
});

test("availability drift separates content, policy, loader, cleanup, and target-extra evidence", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-availability-drift-"));
  try {
    const { createSkillAvailabilityDriftReport } = await compiled.importModule("core/skill-availability-drift.ts");
    const sourceRoot = path.join(root, "source");
    const ambientSource = path.join(sourceRoot, "skills", "ambient");
    const rareSource = path.join(sourceRoot, "skills", "rare");
    const loaderSource = path.join(root, "loader-source");
    const agentRoot = path.join(root, "home", ".codex", "skills");
    const ambientTarget = path.join(agentRoot, "ambient");
    const rareTarget = path.join(root, "home", ".arcforge", "catalog", "a".repeat(24), "rare");
    const loaderTarget = path.join(agentRoot, "arcforge-on-demand");
    const oldRareTarget = path.join(agentRoot, "rare");
    const unrelatedSkill = path.join(agentRoot, "other-source");
    for (const directory of [ambientSource, rareSource, loaderSource, ambientTarget, loaderTarget, oldRareTarget, unrelatedSkill]) {
      await mkdir(directory, { recursive: true });
    }
    await writeFile(path.join(ambientSource, "SKILL.md"), "ambient", "utf8");
    await writeFile(path.join(rareSource, "SKILL.md"), "rare", "utf8");
    await writeFile(path.join(loaderSource, "SKILL.md"), "loader", "utf8");
    await writeFile(path.join(ambientTarget, "SKILL.md"), "ambient", "utf8");
    await writeFile(path.join(loaderTarget, "SKILL.md"), "loader", "utf8");
    await writeFile(path.join(oldRareTarget, "SKILL.md"), "rare", "utf8");
    await writeFile(path.join(unrelatedSkill, "SKILL.md"), "other", "utf8");
    const source = availabilityApplySource(sourceRoot, ambientSource, rareSource);
    const plan = {
      sourceKey: "a".repeat(24),
      sourceIdentity: "path:test",
      profile: "default",
      items: [
        {
          skill: "ambient",
          sourcePath: "skills/ambient",
          sourceRecommendation: "user-ambient",
          sourceRecommendationOrigin: "skill",
          effectiveMode: "user-ambient",
          policyOrigin: "source-skill",
          destinations: [{ kind: "user-agent", agentId: "codex", path: ambientTarget }],
          contentDigest: "ambient-digest"
        },
        {
          skill: "rare",
          sourcePath: "skills/rare",
          sourceRecommendation: "user-on-demand",
          sourceRecommendationOrigin: "skill",
          effectiveMode: "user-on-demand",
          policyOrigin: "source-skill",
          destinations: [{ kind: "user-catalog", path: rareTarget }],
          contentDigest: "rare-digest"
        }
      ],
      loaderTargets: [{ agentId: "codex", path: loaderTarget }],
      cleanup: [{ skill: "rare", path: oldRareTarget, reason: "mode changed", requiresConfirm: true }],
      diagnostics: [],
      requiresConfirm: true
    };
    const record = {
      id: "availability-default",
      sourceRoot,
      profile: "default",
      targetDir: "",
      skills: ["ambient", "rare"],
      availabilityItems: [
        { skill: "ambient", mode: "user-ambient", policyOrigin: "source-skill", destinations: [ambientTarget] },
        { skill: "rare", mode: "user-ambient", policyOrigin: "source-skill", destinations: [oldRareTarget] }
      ],
      updatedAt: "2026-07-31T00:00:00.000Z"
    };
    const report = await createSkillAvailabilityDriftReport({ source, plan, record, loaderSourcePath: loaderSource });

    assert.equal(report.items.find((item) => item.skill === "ambient").status, "same");
    assert.equal(report.items.find((item) => item.skill === "rare").status, "missing");
    assert.equal(report.items.find((item) => item.kind === "loader").status, "same");
    assert.equal(report.policyDrift.find((item) => item.skill === "ambient").status, "same");
    assert.equal(report.policyDrift.find((item) => item.skill === "rare").status, "changed");
    assert.deepEqual(report.availabilityPlan.cleanup, plan.cleanup);
    assert.ok(report.targetExtras.some((item) => item.name === "other-source" && item.classification === "uncertain"));
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("availability apply commits destinations, catalog, cleanup, and record as one transaction", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-availability-apply-"));
  try {
    const { executeSkillAvailabilityPlan } = await compiled.importModule("core/skill-availability-apply.ts");
    const { catalogDirectoryDigest } = await compiled.importModule("core/skill-catalog.ts");
    const sourceRoot = path.join(root, "source");
    const ambientSource = path.join(sourceRoot, "skills", "ambient");
    const onDemandSource = path.join(sourceRoot, "skills", "rare");
    const ambientTarget = path.join(root, "home", ".codex", "skills", "ambient");
    const catalogTarget = path.join(root, "home", ".arcforge", "catalog", "a".repeat(24), "rare");
    const loaderSource = path.join(root, "bundled-loader");
    const loaderTarget = path.join(path.dirname(ambientTarget), "arcforge-on-demand");
    const cleanupTarget = path.join(root, "stale", "rare");
    await mkdir(ambientSource, { recursive: true });
    await mkdir(onDemandSource, { recursive: true });
    await mkdir(ambientTarget, { recursive: true });
    await mkdir(loaderSource, { recursive: true });
    await mkdir(cleanupTarget, { recursive: true });
    await writeFile(path.join(ambientSource, "SKILL.md"), "new ambient", "utf8");
    await writeFile(path.join(onDemandSource, "SKILL.md"), "rare", "utf8");
    await writeFile(path.join(ambientTarget, "SKILL.md"), "old ambient", "utf8");
    await writeFile(path.join(loaderSource, "SKILL.md"), "on-demand loader", "utf8");
    await writeFile(path.join(cleanupTarget, "SKILL.md"), "stale", "utf8");
    const source = availabilityApplySource(sourceRoot, ambientSource, onDemandSource);
    const plan = await availabilityApplyPlan(catalogDirectoryDigest, ambientSource, onDemandSource, ambientTarget, catalogTarget, cleanupTarget, loaderSource);
    const record = availabilityApplyRecord(sourceRoot, plan);
    let recordCommitted = false;
    const execution = await executeSkillAvailabilityPlan({
      source,
      plan,
      cleanupPaths: [cleanupTarget],
      catalogRoot: path.join(root, "home", ".arcforge", "catalog"),
      loaderSourcePath: loaderSource,
      recordCandidate: record,
      commitRecord: async () => { recordCommitted = true; return record; },
      rollbackRecord: async () => { recordCommitted = false; },
      now: new Date("2026-07-30T02:00:00.000Z")
    });

    assert.equal(await readFile(path.join(ambientTarget, "SKILL.md"), "utf8"), "new ambient");
    assert.equal(await readFile(path.join(catalogTarget, "SKILL.md"), "utf8"), "rare");
    assert.equal(await readFile(path.join(loaderTarget, "SKILL.md"), "utf8"), "on-demand loader");
    await assert.rejects(access(cleanupTarget));
    assert.equal(recordCommitted, true);
    assert.equal(execution.result.catalogUpdated, true);
    assert.deepEqual(execution.result.cleanedPaths, [cleanupTarget]);
    assert.ok(execution.result.destinations.some((item) => item.kind === "loader" && item.path === loaderTarget && item.status === "copied"));
    const index = JSON.parse(await readFile(path.join(root, "home", ".arcforge", "catalog", "index.json"), "utf8"));
    assert.deepEqual(index.entries[0].appliedRecordIds, [record.id]);
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("availability apply removes a shared catalog directory only after its last profile owner", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-availability-shared-catalog-"));
  try {
    const { executeSkillAvailabilityPlan } = await compiled.importModule("core/skill-availability-apply.ts");
    const { catalogDirectoryDigest, loadUserSkillCatalog, saveUserSkillCatalog } = await compiled.importModule("core/skill-catalog.ts");
    const sourceRoot = path.join(root, "source");
    const ambientSource = path.join(sourceRoot, "skills", "ambient");
    const rareSource = path.join(sourceRoot, "skills", "rare");
    const catalogRoot = path.join(root, "home", ".arcforge", "catalog");
    const catalogTarget = path.join(catalogRoot, "a".repeat(24), "rare");
    const ambientTarget = path.join(root, "home", ".codex", "skills", "rare");
    for (const directory of [ambientSource, rareSource, catalogTarget]) await mkdir(directory, { recursive: true });
    await writeFile(path.join(ambientSource, "SKILL.md"), "ambient", "utf8");
    await writeFile(path.join(rareSource, "SKILL.md"), "rare", "utf8");
    await writeFile(path.join(catalogTarget, "SKILL.md"), "rare", "utf8");

    const source = availabilityApplySource(sourceRoot, ambientSource, rareSource);
    const sourceKey = "a".repeat(24);
    const contentDigest = await catalogDirectoryDigest(rareSource);
    await saveUserSkillCatalog([{
      qualifiedName: `${sourceKey}:rare`,
      sourceKey,
      skillName: "rare",
      sourceRoot,
      skillPath: "skills/rare",
      installedPath: catalogTarget,
      contentDigest,
      appliedRecordIds: ["profile-a", "profile-b"],
      installedAt: "2026-07-30T00:00:00.000Z"
    }], { catalogRoot, now: new Date("2026-07-30T00:00:00.000Z") });

    const plan = {
      sourceKey,
      sourceIdentity: "path:test",
      profile: "profile-a",
      items: [{
        skill: "rare",
        sourcePath: "skills/rare",
        sourceRecommendation: "user-on-demand",
        sourceRecommendationOrigin: "skill",
        consumerOverride: "user-ambient",
        effectiveMode: "user-ambient",
        policyOrigin: "profile-skill",
        destinations: [{ kind: "user-agent", agentId: "codex", path: ambientTarget }],
        contentDigest
      }],
      loaderTargets: [],
      cleanup: [{ skill: "rare", path: catalogTarget, reason: "mode changed", requiresConfirm: true }],
      diagnostics: [],
      requiresConfirm: true
    };

    const firstRecord = { ...availabilityApplyRecord(sourceRoot, plan), id: "profile-a" };
    const first = await executeSkillAvailabilityPlan({
      source,
      plan,
      cleanupPaths: [catalogTarget],
      catalogRoot,
      recordCandidate: firstRecord,
      commitRecord: async () => firstRecord
    });

    assert.equal(await readFile(path.join(catalogTarget, "SKILL.md"), "utf8"), "rare");
    assert.deepEqual((await loadUserSkillCatalog({ catalogRoot })).entries[0].appliedRecordIds, ["profile-b"]);
    assert.deepEqual(first.result.cleanedPaths, []);

    const lastPlan = { ...plan, profile: "profile-b" };
    const lastRecord = { ...availabilityApplyRecord(sourceRoot, lastPlan), id: "profile-b" };
    const last = await executeSkillAvailabilityPlan({
      source,
      plan: lastPlan,
      cleanupPaths: [catalogTarget],
      catalogRoot,
      recordCandidate: lastRecord,
      commitRecord: async () => lastRecord
    });

    await assert.rejects(access(catalogTarget));
    assert.deepEqual((await loadUserSkillCatalog({ catalogRoot })).entries, []);
    assert.deepEqual(last.result.cleanedPaths, [catalogTarget]);
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("availability apply rolls back directories, cleanup, catalog, and record after a late failure", async () => {
  const compiled = await compileProjectTypeScript();
  const root = await mkdtemp(path.join(tmpdir(), "arcforge-availability-rollback-"));
  try {
    const { executeSkillAvailabilityPlan } = await compiled.importModule("core/skill-availability-apply.ts");
    const { catalogDirectoryDigest } = await compiled.importModule("core/skill-catalog.ts");
    const sourceRoot = path.join(root, "source");
    const ambientSource = path.join(sourceRoot, "skills", "ambient");
    const onDemandSource = path.join(sourceRoot, "skills", "rare");
    const ambientTarget = path.join(root, "home", ".codex", "skills", "ambient");
    const catalogTarget = path.join(root, "home", ".arcforge", "catalog", "a".repeat(24), "rare");
    const loaderSource = path.join(root, "bundled-loader");
    const loaderTarget = path.join(path.dirname(ambientTarget), "arcforge-on-demand");
    const cleanupTarget = path.join(root, "stale", "rare");
    await mkdir(ambientSource, { recursive: true });
    await mkdir(onDemandSource, { recursive: true });
    await mkdir(ambientTarget, { recursive: true });
    await mkdir(loaderSource, { recursive: true });
    await mkdir(cleanupTarget, { recursive: true });
    await writeFile(path.join(ambientSource, "SKILL.md"), "new ambient", "utf8");
    await writeFile(path.join(onDemandSource, "SKILL.md"), "rare", "utf8");
    await writeFile(path.join(ambientTarget, "SKILL.md"), "old ambient", "utf8");
    await writeFile(path.join(loaderSource, "SKILL.md"), "on-demand loader", "utf8");
    await writeFile(path.join(cleanupTarget, "SKILL.md"), "stale", "utf8");
    const source = availabilityApplySource(sourceRoot, ambientSource, onDemandSource);
    const plan = await availabilityApplyPlan(catalogDirectoryDigest, ambientSource, onDemandSource, ambientTarget, catalogTarget, cleanupTarget, loaderSource);
    const record = availabilityApplyRecord(sourceRoot, plan);
    let recordCommitted = false;
    await assert.rejects(executeSkillAvailabilityPlan({
      source,
      plan,
      cleanupPaths: [cleanupTarget],
      catalogRoot: path.join(root, "home", ".arcforge", "catalog"),
      loaderSourcePath: loaderSource,
      recordCandidate: record,
      commitRecord: async () => { recordCommitted = true; return record; },
      rollbackRecord: async () => { recordCommitted = false; },
      faultInjector: (point) => { if (point === "after-record") throw new Error("injected late failure"); }
    }), /injected late failure/);

    assert.equal(await readFile(path.join(ambientTarget, "SKILL.md"), "utf8"), "old ambient");
    assert.equal(await readFile(path.join(cleanupTarget, "SKILL.md"), "utf8"), "stale");
    await assert.rejects(access(catalogTarget));
    await assert.rejects(access(loaderTarget));
    await assert.rejects(access(path.join(root, "home", ".arcforge", "catalog", "index.json")));
    assert.equal(recordCommitted, false);
  } finally {
    await compiled.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("availability-aware apply run is wired through CLI and compatible Electron IPC", async () => {
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");
  const sources = await readFile(new URL("../src/core/sources.ts", import.meta.url), "utf8");
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const preload = await readFile(new URL("../src/electron/preload.cts", import.meta.url), "utf8");

  assert.match(commands, /applyAvailabilityFromSource/);
  assert.match(commands, /driftAvailabilityFromSource/);
  assert.match(commands, /--cleanup-paths/);
  assert.match(sources, /executeSkillAvailabilityPlan/);
  assert.match(sources, /availabilityContext/);
  assert.match(sources, /requiredAvailabilityContext/);
  assert.match(sources, /driftAvailabilityFromSource/);
  assert.match(sources, /cacheDirForInput/);
  assert.match(sources, /Saving this availability relationship requires explicit confirmation/);
  assert.match(electronMain, /typeof rootOrOptions === "string"/);
  assert.match(preload, /applySkillAvailabilityPlan/);
  assert.match(preload, /driftSkillAvailability/);
});

function availabilityApplySource(sourceRoot, ambientSource, onDemandSource) {
  return {
    root: sourceRoot,
    config: { version: 1, sourceDir: "skills", profiles: [{ name: "default", skills: ["*"], targets: ["codex"] }] },
    sourceManifest: {
      version: 1,
      availability: { skills: [{ path: "skills/rare", mode: "user-on-demand", aliases: ["rare-alias"] }] }
    },
    skills: [
      { name: "ambient", description: "ambient", path: ambientSource, relativePath: "skills/ambient", targets: [], hasReferences: false, hasScripts: false },
      { name: "rare", description: "rare summary", path: onDemandSource, relativePath: "skills/rare", targets: [], hasReferences: false, hasScripts: false }
    ],
    assets: [],
    audit: { root: sourceRoot, generatedAt: "", skills: [], findings: [], coverage: { skillsChecked: 0, filesChecked: 0, ruleCategories: [], findingCounts: { info: 0, warning: 0, critical: 0 } }, disclaimer: "", feedbackUrl: "" }
  };
}

async function availabilityApplyPlan(catalogDirectoryDigest, ambientSource, onDemandSource, ambientTarget, catalogTarget, cleanupTarget, loaderSource) {
  const sourceKey = "a".repeat(24);
  return {
    sourceKey,
    sourceIdentity: "path:test",
    profile: "default",
    items: [
      {
        skill: "ambient",
        sourcePath: "skills/ambient",
        sourceRecommendationOrigin: "none",
        effectiveMode: "user-ambient",
        policyOrigin: "invocation",
        destinations: [{ kind: "user-agent", agentId: "codex", path: ambientTarget }],
        contentDigest: await catalogDirectoryDigest(ambientSource)
      },
      {
        skill: "rare",
        sourcePath: "skills/rare",
        sourceRecommendation: "user-on-demand",
        sourceRecommendationOrigin: "skill",
        effectiveMode: "user-on-demand",
        policyOrigin: "source-skill",
        destinations: [{ kind: "user-catalog", path: catalogTarget }],
        contentDigest: await catalogDirectoryDigest(onDemandSource)
      }
    ],
    loaderTargets: [{
      agentId: "codex",
      path: path.join(path.dirname(ambientTarget), "arcforge-on-demand"),
      status: "missing",
      expectedDigest: await catalogDirectoryDigest(loaderSource)
    }],
    cleanup: [{ skill: "rare", path: cleanupTarget, reason: "stale", requiresConfirm: true }],
    diagnostics: [],
    requiresConfirm: true
  };
}

function availabilityApplyRecord(sourceRoot, plan) {
  return {
    id: "availability-default",
    relationKind: "profileApply",
    sourceRoot,
    sourceKey: plan.sourceKey,
    profile: plan.profile,
    targetDir: "",
    skills: plan.items.map((item) => item.skill),
    availabilityItems: plan.items.map((item) => ({
      skill: item.skill,
      mode: item.effectiveMode,
      policyOrigin: item.policyOrigin,
      destinations: item.destinations.map((destination) => destination.path)
    })),
    updatedAt: "2026-07-30T00:00:00.000Z"
  };
}
