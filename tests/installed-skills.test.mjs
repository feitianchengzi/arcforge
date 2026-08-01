import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

async function compileInstalledSkillsCore() {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "arcforge-installed-core-"));
  const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
  for (const relativeFile of ["shared/types.ts", "core/fs.ts", "core/frontmatter.ts", "core/skill-markdown.ts", "core/installed-skills.ts"]) {
    const source = await readFile(path.join(sourceRoot, relativeFile), "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
    const outputPath = path.join(outputRoot, relativeFile.replace(/\.ts$/, ".js"));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output.outputText, "utf8");
  }
  return {
    importModule: (relativePath) => import(pathToFileURL(path.join(outputRoot, relativePath.replace(/\.ts$/, ".js"))).href),
    cleanup: () => rm(outputRoot, { recursive: true, force: true })
  };
}

test("installed skill inventory core and cli contracts are exposed", async () => {
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");
  const core = await readFile(new URL("../src/core/installed-skills.ts", import.meta.url), "utf8");
  const sharedTypes = await readFile(new URL("../src/shared/types.ts", import.meta.url), "utf8");

  assert.match(commands, /installed\s+Scan locally installed and cached agent skills/);
  assert.match(commands, /ArcForge CLI - installed/);
  assert.match(commands, /arcforge installed scan \[--home <dir>\]/);
  assert.match(commands, /--include-system/);
  assert.match(commands, /--no-plugin-cache/);
  assert.match(commands, /arcforge installed organize plan/);
  assert.match(commands, /arcforge installed organize run/);
  assert.match(commands, /--decisions <json-file>/);
  assert.match(commands, /command === "installed"/);
  assert.match(commands, /runInstalledCommand/);
  assert.match(commands, /scanInstalledSkills/);
  assert.match(commands, /createInstalledSkillOrganizePlan/);
  assert.match(commands, /organizeInstalledSkills/);

  assert.match(core, /DEFAULT_INSTALLED_SKILL_ROOTS/);
  assert.match(core, /\.codex[\s\S]*skills/);
  assert.match(core, /\.claude[\s\S]*skills/);
  assert.match(core, /\.cursor[\s\S]*skills/);
  assert.match(core, /\.agents[\s\S]*skills/);
  assert.match(core, /\.codex[\s\S]*plugins[\s\S]*cache/);
  assert.match(core, /includeAgentSystemSkills/);
  assert.match(core, /includeCodexPluginCache/);
  assert.match(core, /isInstalledSkillSystemPath/);
  assert.match(core, /includeAgentSystemSkills: false/);
  assert.match(core, /includeCodexPluginCache: options\.includeCodexPluginCache \?\? true/);
  assert.match(core, /createInstalledSkillOrganizePlan/);
  assert.match(core, /organizeInstalledSkills/);
  assert.match(core, /fileManifest/);
  assert.match(core, /createHash/);
  assert.match(core, /isModifiableInstalledSkill/);
  assert.match(core, /skill\.installKind !== "codex-plugin-cache"/);
  assert.match(core, /Installed skill inventory is evidence only/);
  assert.match(core, /Agent or user decisions are required/);
  assert.match(core, /validateOrganizeDecision/);
  assert.doesNotMatch(core, /chooseCanonical|canonicalScore/);
  assert.match(core, /conflict/);
  assert.match(core, /requiresConfirm/);
  assert.match(core, /agent-user/);
  assert.match(core, /agent-generic/);
  assert.match(core, /codex-plugin-cache/);
  assert.match(core, /channel/);
  assert.match(core, /pluginName/);
  assert.match(core, /revision/);
  assert.match(core, /duplicateGroups/);
  assert.doesNotMatch(core, /writeFile|replaceDirectory|applyProfile/);

  assert.match(sharedTypes, /InstalledSkillsInventory/);
  assert.match(sharedTypes, /InstalledSkillRoot/);
  assert.match(sharedTypes, /InstalledSkillItem/);
  assert.match(sharedTypes, /InstalledSkillDuplicateGroup/);
  assert.match(sharedTypes, /InstalledSkillsScanOptions/);
  assert.match(sharedTypes, /InstalledSkillOrganizePlan/);
  assert.match(sharedTypes, /InstalledSkillOrganizeResult/);
  assert.match(sharedTypes, /InstalledSkillInstallKind = "agent-user" \| "agent-generic" \| "codex-plugin-cache"/);
});

test("installed skill inventory is wired to desktop as a global read-only page", async () => {
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const preload = await readFile(new URL("../src/electron/preload.cts", import.meta.url), "utf8");
  const uiTypes = await readFile(new URL("../src/ui/types.ts", import.meta.url), "utf8");
  const mainUi = await readFile(new URL("../src/ui/main.tsx", import.meta.url), "utf8");
  const installedView = await readFile(new URL("../src/ui/views/installed.tsx", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../src/ui/i18n.ts", import.meta.url), "utf8");

  assert.match(electronMain, /installed:scan/);
  assert.match(electronMain, /installed:organizePlan/);
  assert.match(electronMain, /installed:organizeRun/);
  assert.match(electronMain, /scanInstalledSkills/);
  assert.match(electronMain, /createInstalledSkillOrganizePlan/);
  assert.match(electronMain, /organizeInstalledSkills/);
  assert.match(preload, /scanInstalledSkills/);
  assert.match(preload, /createInstalledSkillOrganizePlan/);
  assert.match(preload, /organizeInstalledSkills/);
  assert.match(uiTypes, /scanInstalledSkills: \(options\?: InstalledSkillsScanOptions\) => Promise<InstalledSkillsInventory>/);
  assert.match(uiTypes, /createInstalledSkillOrganizePlan/);
  assert.match(uiTypes, /organizeInstalledSkills/);
  assert.match(mainUi, /InstalledSkills/);
  assert.match(mainUi, /globalView/);
  assert.match(mainUi, /installedInventory/);
  assert.match(mainUi, /installedError/);
  assert.match(mainUi, /includeAgentSystemSkills: false/);
  assert.match(mainUi, /includeCodexPluginCache: true/);
  assert.match(mainUi, /installedOrganizePlan/);
  assert.match(mainUi, /createInstalledSkillOrganizePlan/);
  assert.doesNotMatch(mainUi, /organizeInstalledSkills\(/);
  assert.match(installedView, /duplicateGroups/);
  assert.match(installedView, /evidenceGroups/);
  assert.match(installedView, /codex-plugin-cache/);
  assert.match(installedView, /error\?: string/);
  assert.match(installedView, /scanOptions/);
  assert.match(installedView, /installedSkillIncludeSystem/);
  assert.match(installedView, /installedSkillIncludePluginCache/);
  assert.match(installedView, /installedSkillOrganize/);
  assert.doesNotMatch(installedView, /onRunOrganizePlan/);
  assert.match(installedView, /InstalledSkillMetadata/);
  assert.match(installedView, /InstalledSkillPath/);
  assert.match(installedView, /installed-skill-row/);
  assert.match(installedView, /installed-skill-path/);
  assert.match(installedView, /installed-skill-plugin/);
  assert.doesNotMatch(installedView, /<h3>\{t\.installedSkills\}<\/h3>/);
  assert.doesNotMatch(installedView, /t\.installedSkillsRefresh/);
  assert.match(installedView, /readonly|read-only/i);
  assert.match(installedView, /imports disabled|does not import|no import/i);
  assert.match(i18n, /installedSkills/);
  assert.match(i18n, /插件缓存/);
  assert.match(i18n, /通用 agents 目录/);
  assert.match(i18n, /系统 skill/);
  assert.match(i18n, /复核重复证据/);
  assert.match(i18n, /待解决/);
});

test("installed skill inventory dev mode waits for compiled desktop handlers", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const dev = pkg.scripts.dev;

  assert.match(dev, /wait-on/);
  assert.match(dev, /dist\/electron\/main\.js/);
  assert.match(dev, /dist\/core\/installed-skills\.js/);
  assert.match(dev, /dist\/electron\/preload\.cjs/);
  assert.doesNotMatch(dev, /wait-on http:\/\/127\.0\.0\.1:5173 dist\/electron\/main\.js &&/);
});

test("installed skill inventory docs preserve ArcForge product boundaries", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const readmeEn = await readFile(new URL("../docs/en/README.md", import.meta.url), "utf8");
  const readmeZh = await readFile(new URL("../docs/zh-CN/README.md", import.meta.url), "utf8");

  for (const text of [readme, readmeEn, readmeZh]) {
    assert.match(text, /installed skill|已安装 skill|已安装 Skill/i);
    assert.match(text, /read-only|只读/i);
    assert.match(text, /Codex/);
    assert.match(text, /Claude/);
    assert.match(text, /Cursor/);
    assert.match(text, /\.agents\/skills|\.agents\\skills/);
    assert.match(text, /plugin cache|插件缓存/i);
    assert.doesNotMatch(text, /marketplace competitor|registry competitor|公共 registry 竞争者|市场竞争者/i);
  }
});

test("installed organize decisions reject malformed runtime JSON as plan conflicts", async () => {
  const compiled = await compileInstalledSkillsCore();
  const home = await mkdtemp(path.join(tmpdir(), "arcforge-installed-decisions-"));
  try {
    const skillPath = path.join(home, ".codex", "skills", "review");
    await mkdir(skillPath, { recursive: true });
    await writeFile(path.join(skillPath, "SKILL.md"), "---\nname: review\ndescription: test\n---\n", "utf8");
    const { createInstalledSkillOrganizePlan } = await compiled.importModule("core/installed-skills.ts");
    const malformed = await createInstalledSkillOrganizePlan({ home, decisions: [{ skillName: "review" }] });
    assert.equal(malformed.actions.length, 0);
    assert.match(malformed.conflicts[0].reason, /canonicalPath is required/);

    const unknownAction = await createInstalledSkillOrganizePlan({
      home,
      decisions: [{
        skillName: "review",
        canonicalPath: skillPath,
        reason: "Caller decision",
        evidence: ["Observed copy"],
        actions: [{ kind: "invented-action", skillName: "review", sourcePath: skillPath, targetPath: path.join(home, ".agents", "skills", "review"), reason: "Invalid", manifestSignature: "invalid" }]
      }]
    });
    assert.equal(unknownAction.actions.length, 0);
    assert.match(unknownAction.conflicts[0].reason, /Unknown organize action kind/);
  } finally {
    await compiled.cleanup();
    await rm(home, { recursive: true, force: true });
  }
});
